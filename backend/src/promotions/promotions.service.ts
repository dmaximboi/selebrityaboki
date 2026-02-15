/**
 * Promotions Service
 * 
 * Manages flash sales, Ramadan delivery discounts, and promotional campaigns.
 * All pricing and eligibility is calculated server-side — never trust frontend.
 */

import {
    Injectable,
    BadRequestException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// Delivery zone mapping — areas near the shop
const ZONE_1_AREAS = [
    'iyana technical',
    'ogidi',
    'oja oba',
    'okolowo',
    'iyana technical ogidi',
];

@Injectable()
export class PromotionsService {
    private readonly logger = new Logger(PromotionsService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ============================================
    // FLASH SALES (Admin-controlled)
    // ============================================

    /**
     * Get all active flash sales (public)
     */
    async getActiveFlashSales() {
        const now = new Date();
        return this.prisma.flashSale.findMany({
            where: {
                isActive: true,
                startTime: { lte: now },
                endTime: { gt: now },
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        imageUrl: true,
                        price: true,
                        unit: true,
                        description: true,
                        isAvailable: true,
                    },
                },
            },
            orderBy: { endTime: 'asc' },
        });
    }

    /**
     * Get all flash sales for admin (including inactive/expired)
     */
    async getAllFlashSales() {
        return this.prisma.flashSale.findMany({
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                        price: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Create a flash sale (admin only)
     * Security: prices are validated server-side
     */
    async createFlashSale(data: {
        productId: string;
        salePrice: number;
        imageUrl?: string;
        bannerText?: string;
        startTime: string;
        endTime: string;
        createdBy?: string;
    }) {
        // Validate product exists and get current price
        const product = await this.prisma.product.findUnique({
            where: { id: data.productId },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // Validate sale price is less than original
        if (new Decimal(data.salePrice).gte(product.price)) {
            throw new BadRequestException(
                'Sale price must be less than the original price'
            );
        }

        const startTime = new Date(data.startTime);
        const endTime = new Date(data.endTime);

        if (endTime <= startTime) {
            throw new BadRequestException('End time must be after start time');
        }

        return this.prisma.flashSale.create({
            data: {
                productId: data.productId,
                salePrice: data.salePrice,
                originalPrice: product.price,
                imageUrl: data.imageUrl,
                bannerText: data.bannerText || 'Flash Sale!',
                startTime,
                endTime,
                createdBy: data.createdBy,
            },
            include: {
                product: {
                    select: { name: true, imageUrl: true },
                },
            },
        });
    }

    /**
     * Update a flash sale (admin only)
     */
    async updateFlashSale(
        id: string,
        data: {
            salePrice?: number;
            imageUrl?: string;
            bannerText?: string;
            startTime?: string;
            endTime?: string;
            isActive?: boolean;
        }
    ) {
        const existing = await this.prisma.flashSale.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException('Flash sale not found');
        }

        return this.prisma.flashSale.update({
            where: { id },
            data: {
                ...(data.salePrice !== undefined && { salePrice: data.salePrice }),
                ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
                ...(data.bannerText !== undefined && { bannerText: data.bannerText }),
                ...(data.startTime && { startTime: new Date(data.startTime) }),
                ...(data.endTime && { endTime: new Date(data.endTime) }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
    }

    /**
     * Delete a flash sale (admin only)
     */
    async deleteFlashSale(id: string) {
        await this.prisma.flashSale.delete({ where: { id } });
        return { success: true };
    }

    // ============================================
    // PROMOTIONS (Admin-controlled campaigns)
    // ============================================

    /**
     * Get active promotions (public)
     */
    async getActivePromotions() {
        const now = new Date();
        return this.prisma.promotion.findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gt: now },
            },
            orderBy: { endDate: 'asc' },
        });
    }

    /**
     * Get all promotions (admin)
     */
    async getAllPromotions() {
        return this.prisma.promotion.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Create promotion (admin only)
     */
    async createPromotion(data: {
        type: 'FLASH_SALE' | 'RAMADAN_DELIVERY' | 'REFERRAL';
        title: string;
        description?: string;
        discountPercent: number;
        minOrderAmount?: number;
        maxDiscount?: number;
        startDate: string;
        endDate: string;
        createdBy?: string;
    }) {
        if (data.discountPercent < 0 || data.discountPercent > 100) {
            throw new BadRequestException('Discount must be between 0 and 100');
        }

        return this.prisma.promotion.create({
            data: {
                type: data.type,
                title: data.title,
                description: data.description,
                discountPercent: data.discountPercent,
                minOrderAmount: data.minOrderAmount || 0,
                maxDiscount: data.maxDiscount,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                createdBy: data.createdBy,
            },
        });
    }

    /**
     * Update promotion (admin only)
     */
    async updatePromotion(id: string, data: Partial<{
        title: string;
        description: string;
        discountPercent: number;
        minOrderAmount: number;
        isActive: boolean;
        startDate: string;
        endDate: string;
    }>) {
        return this.prisma.promotion.update({
            where: { id },
            data: {
                ...data,
                ...(data.startDate && { startDate: new Date(data.startDate) }),
                ...(data.endDate && { endDate: new Date(data.endDate) }),
            },
        });
    }

    /**
     * Delete promotion (admin only)
     */
    async deletePromotion(id: string) {
        await this.prisma.promotion.delete({ where: { id } });
        return { success: true };
    }

    // ============================================
    // DELIVERY ZONE CALCULATION
    // ============================================

    /**
     * Determine delivery zone from address string
     * Zone 1 (100% free): Ogidi, Oja Oba, Okolowo area
     * Zone 2 (50% off): Anywhere farther
     */
    determineDeliveryZone(address: string): 'ZONE_1_FREE' | 'ZONE_2_HALF' | 'ZONE_3_FULL' {
        const normalized = address.toLowerCase().trim();

        for (const area of ZONE_1_AREAS) {
            if (normalized.includes(area)) {
                return 'ZONE_1_FREE';
            }
        }

        // Default: Zone 2 during Ramadan, Zone 3 otherwise
        return 'ZONE_2_HALF';
    }

    /**
     * Calculate delivery discount for an order
     * Rules:
     *  - Order > ₦20,000 during active Ramadan promotion
     *  - Zone 1 (near shop): 100% delivery free
     *  - Zone 2 (farther): 50% off delivery
     */
    async calculateDeliveryDiscount(
        orderTotal: Decimal,
        deliveryFee: Decimal,
        address: string
    ): Promise<{
        zone: 'ZONE_1_FREE' | 'ZONE_2_HALF' | 'ZONE_3_FULL';
        discountAmount: Decimal;
        discountPercent: number;
    }> {
        // Check if there's an active Ramadan delivery promotion
        const now = new Date();
        const ramadanPromo = await this.prisma.promotion.findFirst({
            where: {
                type: 'RAMADAN_DELIVERY',
                isActive: true,
                startDate: { lte: now },
                endDate: { gt: now },
            },
        });

        if (!ramadanPromo) {
            return {
                zone: 'ZONE_3_FULL',
                discountAmount: new Decimal(0),
                discountPercent: 0,
            };
        }

        // Check minimum order amount (₦20,000)
        const minAmount = ramadanPromo.minOrderAmount || new Decimal(20000);
        if (orderTotal.lt(minAmount)) {
            return {
                zone: 'ZONE_3_FULL',
                discountAmount: new Decimal(0),
                discountPercent: 0,
            };
        }

        // Determine zone
        const zone = this.determineDeliveryZone(address);

        let discountPercent: number;
        switch (zone) {
            case 'ZONE_1_FREE':
                discountPercent = 100;
                break;
            case 'ZONE_2_HALF':
                discountPercent = 50;
                break;
            default:
                discountPercent = 0;
        }

        const discountAmount = deliveryFee.mul(discountPercent).div(100);

        return { zone, discountAmount, discountPercent };
    }

    /**
     * Get flash sale price for a specific product (if active)
     */
    async getFlashSalePrice(productId: string): Promise<Decimal | null> {
        const now = new Date();
        const sale = await this.prisma.flashSale.findFirst({
            where: {
                productId,
                isActive: true,
                startTime: { lte: now },
                endTime: { gt: now },
            },
        });

        return sale ? sale.salePrice : null;
    }
}
