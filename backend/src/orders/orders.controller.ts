/**
 * Orders Controller
 * 
 * All order endpoints are protected
 */

import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role, OrderStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import {
    IsString,
    IsArray,
    IsNumber,
    IsOptional,
    ValidateNested,
    Min,
    MaxLength,
    IsEmail,
    IsPhoneNumber,
    IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
    @IsString()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;
}

class CreateOrderDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @IsString()
    @MaxLength(100)
    customerName: string;

    @IsEmail()
    customerEmail: string;

    @IsString()
    customerPhone: string;

    @IsString()
    @MaxLength(500)
    deliveryAddress: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    notes?: string;
}

class UpdateStatusDto {
    @IsEnum(OrderStatus)
    status: OrderStatus;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly authService: AuthService
    ) { }

    /**
     * Create a new order
     * Frontend sends ONLY product IDs and quantities
     * Prices are calculated server-side
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createOrder(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateOrderDto
    ) {
        return this.ordersService.createOrder(userId, dto);
    }

    /**
     * Get current user's orders
     */
    @Get('my-orders')
    async getMyOrders(@CurrentUser('id') userId: string) {
        return this.ordersService.getUserOrders(userId);
    }

    /**
     * Get order by ID (public for receipt viewing)
     * PII is redacted for unauthenticated users
     */
    @Public()
    @Get(':id')
    async getOrder(@Param('id') id: string, @CurrentUser() user: any) {
        const order = await this.ordersService.getOrder(id);

        if (!order) return null;

        // Check if full details should be shown (Admin or Owner)
        const isOwner = user && order.userId === user.sub;
        const isAdmin = user && this.authService.isAdmin(user);

        if (isOwner || isAdmin) {
            return order;
        }

        // Redact PII for public/unauthorized view
        return {
            id: order.id,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt,
            items: order.items.map((item: any) => ({
                id: item.id,
                name: item.productName || item.product?.name,
                price: item.price,
                quantity: item.quantity,
            })),
            isRedacted: true,
        };
    }

    /**
     * Update order status (admin only)
     */
    @Patch(':id/status')
    @UseGuards(AdminGuard)
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateStatusDto
    ) {
        return this.ordersService.updateOrderStatus(id, dto.status);
    }
}
