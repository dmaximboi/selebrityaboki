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
    BadRequestException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PaymentOwnerGuard } from '../common/guards/payment-verify.guard';
import { OrderStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import {
    IsString,
    IsArray,
    IsNumber,
    IsOptional,
    ValidateNested,
    Min,
    Max,
    MaxLength,
    IsEmail,
    IsEnum,
    Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
    @IsString()
    @MaxLength(100)
    @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid product ID format' })
    productId: string;

    @IsNumber()
    @Min(1)
    @Max(100)
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
    @MaxLength(20)
    customerPhone: string;

    @IsString()
    @MaxLength(500)
    deliveryAddress: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    notes?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    referralCode?: string;
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

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createOrder(
        @CurrentUser('id') userId: string,
        @Body() dto: CreateOrderDto
    ) {
        return this.ordersService.createOrder(userId, dto);
    }

    @Get('my-orders')
    async getMyOrders(@CurrentUser('id') userId: string) {
        return this.ordersService.getUserOrders(userId);
    }

    @Public()
    @Get(':id')
    async getOrder(@Param('id') id: string, @CurrentUser() user: any) {
        const order = await this.ordersService.getOrder(id);

        if (!order) return null;

        const isOwner = user && order.userId === user.sub;
        const isAdmin = user && this.authService.isAdmin(user);

        if (isOwner || isAdmin) {
            return order;
        }

        return {
            id: order.id,
            total: order.totalAmount,
            status: order.status,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
            items: order.items.map((item: any) => ({
                id: item.id,
                name: item.productName || item.product?.name,
                price: item.priceAtTime,
                quantity: item.quantity,
                imageUrl: item.product?.imageUrl,
                unit: item.product?.unit,
            })),
            deliveryFee: order.deliveryFee,
            discountAmount: order.discountAmount,
            isRedacted: true,
        };
    }

    @Post(':id/pay')
    @UseGuards(PaymentOwnerGuard)
    @HttpCode(HttpStatus.OK)
    async initializePayment(@Param('id') id: string) {
        return this.ordersService.initializePayment(id);
    }

    @Patch(':id/status')
    @UseGuards(AdminGuard)
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateStatusDto
    ) {
        return this.ordersService.updateOrderStatus(id, dto.status as any);
    }
}
