/**
 * Promotions Controller
 * 
 * Public: view active promos and flash sales
 * Admin: full CRUD for promotions and flash sales
 */

import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { Public } from '../common/decorators/public.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
    IsString,
    IsNumber,
    IsOptional,
    IsBoolean,
    IsEnum,
    IsDateString,
    Min,
    Max,
    MaxLength,
} from 'class-validator';

// ============================================
// DTOs — Strict validation for all admin input
// ============================================

class CreateFlashSaleDto {
    @IsString()
    productId: string;

    @IsNumber()
    @Min(0)
    salePrice: number;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    bannerText?: string;

    @IsDateString()
    startTime: string;

    @IsDateString()
    endTime: string;
}

class UpdateFlashSaleDto {
    @IsNumber()
    @Min(0)
    @IsOptional()
    salePrice?: number;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    bannerText?: string;

    @IsDateString()
    @IsOptional()
    startTime?: string;

    @IsDateString()
    @IsOptional()
    endTime?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

class CreatePromotionDto {
    @IsEnum(['FLASH_SALE', 'RAMADAN_DELIVERY', 'REFERRAL'])
    type: 'FLASH_SALE' | 'RAMADAN_DELIVERY' | 'REFERRAL';

    @IsString()
    @MaxLength(200)
    title: string;

    @IsString()
    @IsOptional()
    @MaxLength(2000)
    description?: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    discountPercent: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    minOrderAmount?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    maxDiscount?: number;

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;
}

class UpdatePromotionDto {
    @IsString()
    @IsOptional()
    @MaxLength(200)
    title?: string;

    @IsString()
    @IsOptional()
    @MaxLength(2000)
    description?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Max(100)
    discountPercent?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    minOrderAmount?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsDateString()
    @IsOptional()
    startDate?: string;

    @IsDateString()
    @IsOptional()
    endDate?: string;
}

@Controller('promotions')
export class PromotionsController {
    constructor(private readonly promotionsService: PromotionsService) { }

    // ============================================
    // PUBLIC ENDPOINTS
    // ============================================

    /**
     * Get currently active promotions
     */
    @Public()
    @Get('active')
    async getActivePromotions() {
        return this.promotionsService.getActivePromotions();
    }

    /**
     * Get active flash sales with countdown info
     */
    @Public()
    @Get('flash-sales')
    async getFlashSales() {
        return this.promotionsService.getActiveFlashSales();
    }

    // ============================================
    // ADMIN ENDPOINTS — Flash Sales
    // ============================================

    /**
     * Get all flash sales (admin)
     */
    @Get('admin/flash-sales')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async getAllFlashSales() {
        return this.promotionsService.getAllFlashSales();
    }

    /**
     * Create flash sale (admin)
     */
    @Post('admin/flash-sales')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @HttpCode(HttpStatus.CREATED)
    async createFlashSale(
        @Body() dto: CreateFlashSaleDto,
        @CurrentUser('id') adminId: string
    ) {
        return this.promotionsService.createFlashSale({
            ...dto,
            createdBy: adminId,
        });
    }

    /**
     * Update flash sale (admin)
     */
    @Patch('admin/flash-sales/:id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async updateFlashSale(
        @Param('id') id: string,
        @Body() dto: UpdateFlashSaleDto
    ) {
        return this.promotionsService.updateFlashSale(id, dto);
    }

    /**
     * Delete flash sale (admin)
     */
    @Delete('admin/flash-sales/:id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async deleteFlashSale(@Param('id') id: string) {
        return this.promotionsService.deleteFlashSale(id);
    }

    // ============================================
    // ADMIN ENDPOINTS — Promotions
    // ============================================

    /**
     * Get all promotions (admin)
     */
    @Get('admin/all')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async getAllPromotions() {
        return this.promotionsService.getAllPromotions();
    }

    /**
     * Create promotion (admin)
     */
    @Post('admin')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @HttpCode(HttpStatus.CREATED)
    async createPromotion(
        @Body() dto: CreatePromotionDto,
        @CurrentUser('id') adminId: string
    ) {
        return this.promotionsService.createPromotion({
            ...dto,
            createdBy: adminId,
        });
    }

    /**
     * Update promotion (admin)
     */
    @Patch('admin/:id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async updatePromotion(
        @Param('id') id: string,
        @Body() dto: UpdatePromotionDto
    ) {
        return this.promotionsService.updatePromotion(id, dto);
    }

    /**
     * Delete promotion (admin)
     */
    @Delete('admin/:id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async deletePromotion(@Param('id') id: string) {
        return this.promotionsService.deletePromotion(id);
    }
}
