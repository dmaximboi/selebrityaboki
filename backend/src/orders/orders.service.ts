/**
 * Orders Service
 * 
 * THE BRAIN: All order logic happens here
 * Frontend NEVER sends prices - only product IDs and quantities
 */

import {
    Injectable,
    BadRequestException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralsService } from '../referrals/referrals.service';
import { PromotionsService } from '../promotions/promotions.service';
import { randomBytes } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateOrderItem {
    productId: string;
    quantity: number;
}

interface CreateOrderDto {
    items: CreateOrderItem[];
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    deliveryAddress: string;
    notes?: string;
}

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly referralsService: ReferralsService,
        private readonly promotionsService: PromotionsService,
    ) { }

    /**
     * Create a new order with crypto-secure ID
     * 
     * SECURITY: We ONLY accept product IDs and quantities
     * Prices are fetched from the database - NEVER from frontend
     */
    async createOrder(userId: string | null, dto: CreateOrderDto) {
        const { items, customerName, customerEmail, customerPhone, deliveryAddress, notes } = dto;

        if (!items || items.length === 0) {
            throw new BadRequestException('Order must contain at least one item');
        }

        let calculatedTotal = new Decimal(0);
        const orderItems: Array<{
            productId: string;
            quantity: number;
            priceAtTime: Decimal;
        }> = [];

        // Validate each item and calculate total from DATABASE prices
        for (const item of items) {
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
            });

            if (!product) {
                throw new BadRequestException(`Product not found: ${item.productId}`);
            }

            if (!product.isAvailable) {
                throw new BadRequestException(`Product not available: ${product.name}`);
            }

            if (product.stock < item.quantity) {
                throw new BadRequestException(
                    `Insufficient stock for ${product.name}. Available: ${product.stock}`
                );
            }

            if (item.quantity < product.minOrder) {
                throw new BadRequestException(
                    `Minimum order for ${product.name} is ${product.minOrder}`
                );
            }

            // Use flash sale price if available, then discount price, then regular price
            const flashSalePrice = await this.promotionsService.getFlashSalePrice(item.productId);
            const unitPrice = flashSalePrice || product.discountPrice || product.price;
            const lineTotal = unitPrice.mul(item.quantity);
            calculatedTotal = calculatedTotal.add(lineTotal);

            orderItems.push({
                productId: item.productId,
                quantity: item.quantity,
                priceAtTime: unitPrice,
            });
        }

        // ============================================
        // REFERRAL DISCOUNT (server-calculated)
        // ============================================
        let discountAmount = new Decimal(0);
        let appliedReferralCode: string | null = null;

        if (userId) {
            const reward = await this.referralsService.checkReferralReward(userId);
            if (reward.eligible) {
                discountAmount = calculatedTotal.mul(reward.discountPercent).div(100);
                await this.referralsService.consumeReward(userId);
                appliedReferralCode = 'REWARD_APPLIED';
                this.logger.log(`Referral discount applied: ${reward.discountPercent}% = ₦${discountAmount}`);
            }
        }

        // ============================================
        // DELIVERY ZONE DISCOUNT (server-calculated)
        // ============================================
        const deliveryFee = new Decimal(2000); // Base delivery fee ₦2,000
        const deliveryResult = await this.promotionsService.calculateDeliveryDiscount(
            calculatedTotal,
            deliveryFee,
            deliveryAddress
        );

        const finalTotal = calculatedTotal.sub(discountAmount).add(deliveryFee).sub(deliveryResult.discountAmount);

        // Generate crypto-secure order ID: SELA-XXXX-XXXX
        const secureId = this.generateSecureOrderId();

        // Create order in transaction (atomic operation)
        const order = await this.prisma.$transaction(async (tx) => {
            // 1. Create the order
            const newOrder = await tx.order.create({
                data: {
                    id: secureId,
                    userId,
                    customerName,
                    customerEmail,
                    customerPhone,
                    deliveryAddress,
                    notes,
                    totalAmount: finalTotal,
                    discountAmount,
                    deliveryDiscount: deliveryResult.discountAmount,
                    deliveryZone: deliveryResult.zone,
                    referralCode: appliedReferralCode,
                    deliveryFee: deliveryFee.sub(deliveryResult.discountAmount),
                    items: {
                        create: orderItems,
                    },
                },
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                    imageUrl: true,
                                },
                            },
                        },
                    },
                },
            });

            // 2. Decrease stock for each product
            for (const item of orderItems) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { decrement: item.quantity },
                    },
                });
            }

            return newOrder;
        });

        // Generate WhatsApp link (server-side)
        const whatsappUrl = this.generateWhatsAppLink(order);

        // Complete referral for referred user (if applicable)
        if (userId) {
            await this.referralsService.completeReferral(userId, secureId);
        }

        this.logger.log(`Order created: ${secureId} for ${customerPhone}`);

        return {
            success: true,
            orderId: secureId,
            subtotal: calculatedTotal.toNumber(),
            discountAmount: discountAmount.toNumber(),
            deliveryFee: deliveryFee.toNumber(),
            deliveryDiscount: deliveryResult.discountAmount.toNumber(),
            deliveryZone: deliveryResult.zone,
            totalAmount: finalTotal.toNumber(),
            whatsappUrl,
            order,
        };
    }

    /**
     * Get order by ID
     */
    async getOrder(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                imageUrl: true,
                                unit: true,
                            },
                        },
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return {
            ...order,
            whatsappUrl: this.generateWhatsAppLink(order),
        };
    }

    /**
     * Get user's orders
     */
    async getUserOrders(userId: string) {
        return this.prisma.order.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Update order status (admin only)
     */
    async updateOrderStatus(
        orderId: string,
        status: 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
    ) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // If cancelling, restore stock
        if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
            const items = await this.prisma.orderItem.findMany({
                where: { orderId },
            });

            await this.prisma.$transaction(async (tx) => {
                // Restore stock
                for (const item of items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stock: { increment: item.quantity },
                        },
                    });
                }

                // Update order status
                await tx.order.update({
                    where: { id: orderId },
                    data: { status },
                });
            });
        } else {
            await this.prisma.order.update({
                where: { id: orderId },
                data: {
                    status,
                    deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
                },
            });
        }

        return { success: true, status };
    }

    /**
     * Initialize Flutterwave payment for an order
     * Returns a payment link that the frontend redirects to
     */
    async initializePayment(orderId: string) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true } } },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.paymentStatus === 'SUCCESS') {
            throw new BadRequestException('Order already paid');
        }

        const txRef = `SELA-PAY-${orderId}-${Date.now()}`;
        const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';

        // Call Flutterwave API to create payment
        const response = await fetch('https://api.flutterwave.com/v3/payments', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.config.get('FLW_SECRET_KEY')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tx_ref: txRef,
                amount: order.totalAmount.toNumber(),
                currency: 'NGN',
                redirect_url: `${frontendUrl}/receipt?orderId=${orderId}`,
                customer: {
                    email: order.customerEmail,
                    name: order.customerName,
                    phonenumber: order.customerPhone,
                },
                customizations: {
                    title: 'SelebrityAboki Fruit',
                    description: `Order ${orderId}`,
                    logo: `${frontendUrl}/icons/icon-192x192.png`,
                },
                meta: {
                    order_id: orderId,
                },
            }),
        });

        const result = await response.json();

        if (result.status !== 'success') {
            this.logger.error(`Flutterwave init failed: ${JSON.stringify(result)}`);
            throw new BadRequestException('Payment initialization failed');
        }

        // Save payment ref to order
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                paymentRef: txRef,
                paymentMethod: 'flutterwave',
            },
        });

        this.logger.log(`Payment initialized for order ${orderId}: ${txRef}`);

        return {
            success: true,
            paymentLink: result.data.link,
            txRef,
        };
    }

    /**
     * Verify Flutterwave transaction server-side and confirm order
     * Called from webhook — NEVER trust frontend
     */
    async verifyAndConfirmPayment(txRef: string, transactionId: number, amount: number) {
        // 1. Find the order by tx_ref
        const order = await this.prisma.order.findFirst({
            where: { paymentRef: txRef },
        });

        if (!order) {
            this.logger.warn(`Payment received for unknown tx_ref: ${txRef}`);
            return { success: false };
        }

        if (order.paymentStatus === 'SUCCESS') {
            this.logger.log(`Order ${order.id} already confirmed, skipping`);
            return { success: true, orderId: order.id };
        }

        // 2. Verify transaction with Flutterwave API (server-side verification)
        const verifyResponse = await fetch(
            `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
            {
                headers: {
                    Authorization: `Bearer ${this.config.get('FLW_SECRET_KEY')}`,
                },
            },
        );

        const verification = await verifyResponse.json();

        if (
            verification.status !== 'success' ||
            verification.data.status !== 'successful' ||
            verification.data.currency !== 'NGN'
        ) {
            this.logger.warn(
                `Payment verification failed for ${order.id}: ${JSON.stringify(verification.data?.status)}`
            );
            return { success: false };
        }

        // 3. Verify amount matches
        if (verification.data.amount < order.totalAmount.toNumber()) {
            this.logger.warn(
                `Amount mismatch for ${order.id}: expected ${order.totalAmount}, got ${verification.data.amount}`
            );
            return { success: false };
        }

        // 4. Update order as paid
        await this.prisma.order.update({
            where: { id: order.id },
            data: {
                paymentStatus: 'SUCCESS',
                status: 'CONFIRMED',
                paidAt: new Date(),
            },
        });

        this.logger.log(`✅ Payment confirmed for order: ${order.id} | ₦${amount}`);

        return { success: true, orderId: order.id };
    }

    // ============================================
    // PRIVATE METHODS
    // ============================================

    private generateSecureOrderId(): string {
        const bytes = randomBytes(6);
        const hex = bytes.toString('hex').toUpperCase();
        return `SELA-${hex.substring(0, 4)}-${hex.substring(4, 8)}-${hex.substring(8, 12)}`;
    }

    /**
     * Generate WhatsApp link with order details
     * The message is crafted server-side - user cannot modify it
     */
    public generateWhatsAppLink(order: any): string {
        const sellerPhone = this.config.get('WHATSAPP_PHONE') || '2348032958708';
        const frontendUrl = this.config.get('FRONTEND_URL') || 'https://selebrityaboki.com';
        const receiptUrl = `${frontendUrl}/receipt/${order.id}`;

        const itemsList = order.items
            .map(
                (item: any) =>
                    `- ${item.product.name} x${item.quantity} @ N${item.priceAtTime}`
            )
            .join('\n');

        const message = `
Hello SelebrityAboki Fruit!

I just placed an order:

Order ID: *${order.id}*
${itemsList}

Total: *N${order.totalAmount}*

Delivery Address: ${order.deliveryAddress}

Please confirm my order.
Receipt: ${receiptUrl}
    `.trim();

        return `https://wa.me/${sellerPhone}?text=${encodeURIComponent(message)}`;
    }
}
