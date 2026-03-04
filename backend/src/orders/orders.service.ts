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
import { randomBytes, createHmac } from 'crypto';
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
    referralCode?: string;
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

    async createOrder(userId: string | null, dto: CreateOrderDto) {
        const { items, customerName, customerEmail, customerPhone, deliveryAddress, notes } = dto;

        if (!items || items.length === 0) {
            throw new BadRequestException('Order must contain at least one item');
        }

        if (items.length > 20) {
            throw new BadRequestException('Too many items in a single order');
        }

        let calculatedTotal = new Decimal(0);
        const orderItems: Array<{
            productId: string;
            quantity: number;
            priceAtTime: Decimal;
        }> = [];

        for (const item of items) {
            if (!item.productId || typeof item.productId !== 'string' || item.productId.length > 100) {
                throw new BadRequestException('Invalid product ID');
            }

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

        let discountAmount = new Decimal(0);
        let appliedReferralCode: string | null = dto.referralCode || null;

        if (userId) {
            const reward = await this.referralsService.checkReferralReward(userId);
            if (reward.eligible) {
                discountAmount = calculatedTotal.mul(reward.discountPercent).div(100);
                await this.referralsService.consumeReward(userId);
                appliedReferralCode = 'REWARD_APPLIED';
                this.logger.log(`Referral reward applied for ${userId}`);
            }
        }

        if (!discountAmount.gt(0) && dto.referralCode) {
            const validation = await this.referralsService.validateCode(dto.referralCode);
            if (validation.valid) {
                discountAmount = calculatedTotal.mul(5).div(100);
            }
        }

        const deliveryFee = new Decimal(2000);
        const deliveryResult = await this.promotionsService.calculateDeliveryDiscount(
            calculatedTotal,
            deliveryFee,
            deliveryAddress
        );

        const finalTotal = calculatedTotal.sub(discountAmount).add(deliveryFee).sub(deliveryResult.discountAmount);

        const secureId = this.generateSecureOrderId();

        const order = await this.prisma.$transaction(async (tx) => {
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

        const whatsappUrl = this.generateWhatsAppLink(order);

        if (userId) {
            await this.referralsService.completeReferral(userId, secureId);
        }

        this.logger.log(`Order created: ${secureId}`);

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

    async getOrder(orderId: string) {
        if (!orderId || !/^SAF-[A-Za-z0-9]{5}$/.test(orderId)) {
            throw new BadRequestException('Invalid order ID format');
        }

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

        if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
            const items = await this.prisma.orderItem.findMany({
                where: { orderId },
            });

            await this.prisma.$transaction(async (tx) => {
                for (const item of items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stock: { increment: item.quantity },
                        },
                    });
                }

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

        const txRef = `SAF-PAY-${orderId}-${randomBytes(8).toString('hex')}`;
        const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';

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
            this.logger.error('Flutterwave init failed');
            throw new BadRequestException('Payment initialization failed');
        }

        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                paymentRef: txRef,
                paymentMethod: 'flutterwave',
            },
        });

        return {
            success: true,
            paymentLink: result.data.link,
            txRef,
        };
    }

    async verifyAndConfirmPayment(txRef: string, transactionId: number, amount: number) {
        if (!txRef || !transactionId || !amount) {
            this.logger.warn('Invalid webhook payload — missing required fields');
            return { success: false };
        }

        const order = await this.prisma.order.findFirst({
            where: { paymentRef: txRef },
        });

        if (!order) {
            this.logger.warn('Payment received for unknown tx_ref');
            return { success: false };
        }

        if (order.paymentStatus === 'SUCCESS') {
            return { success: true, orderId: order.id };
        }

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
            this.logger.warn(`Payment verification failed for order ${order.id}`);
            return { success: false };
        }

        const expectedRef = order.paymentRef;
        if (verification.data.tx_ref !== expectedRef) {
            this.logger.warn(`tx_ref mismatch for order ${order.id}: expected ${expectedRef}`);
            return { success: false };
        }

        const verifiedAmount = Number(verification.data.amount);
        const orderAmount = order.totalAmount.toNumber();
        const tolerance = 0.5;

        if (verifiedAmount < orderAmount - tolerance) {
            this.logger.warn(
                `Amount mismatch for ${order.id}: expected ${orderAmount}, got ${verifiedAmount}`
            );
            return { success: false };
        }

        await this.prisma.order.update({
            where: { id: order.id },
            data: {
                paymentStatus: 'SUCCESS',
                status: 'CONFIRMED',
                paidAt: new Date(),
            },
        });

        return { success: true, orderId: order.id };
    }

    async logPaymentAttempt(data: {
        txRef?: string;
        transactionId?: string;
        status: string;
        amount?: number;
        currency?: string;
        rawBody: any;
        ip?: string;
        userAgent?: string;
    }) {
        try {
            await this.prisma.paymentAttempt.create({
                data: {
                    txRef: data.txRef,
                    transactionId: data.transactionId,
                    status: data.status,
                    amount: data.amount,
                    currency: data.currency,
                    rawBody: data.rawBody as any,
                    ip: data.ip,
                    userAgent: data.userAgent,
                },
            });
        } catch (e) {
            this.logger.error('Failed to log payment attempt');
        }
    }

    private generateSecureOrderId(): string {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const bytes = randomBytes(16);
        let id = '';
        for (let i = 0; i < 5; i++) {
            id += charset[bytes[i] % charset.length];
        }
        return `SAF-${id}`;
    }

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
