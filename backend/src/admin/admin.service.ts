/**
 * Admin Service
 * 
 * Dashboard statistics and management operations
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get dashboard overview stats
     */
    async getDashboardStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalOrders,
            todayOrders,
            pendingOrders,
            totalRevenue,
            totalProducts,
            lowStockProducts,
            totalUsers,
            newUsersToday,
            unreadContacts,
        ] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.order.count({ where: { createdAt: { gte: today } } }),
            this.prisma.order.count({ where: { status: 'PENDING' } }),
            this.prisma.order.aggregate({
                where: { paymentStatus: 'SUCCESS' },
                _sum: { totalAmount: true },
            }),
            this.prisma.product.count(),
            this.prisma.product.count({ where: { stock: { lt: 10 } } }),
            this.prisma.user.count(),
            this.prisma.user.count({ where: { createdAt: { gte: today } } }),
            this.prisma.contactSubmission.count({ where: { isRead: false } }),
        ]);

        return {
            orders: {
                total: totalOrders,
                today: todayOrders,
                pending: pendingOrders,
            },
            revenue: {
                total: totalRevenue._sum.totalAmount?.toNumber() || 0,
            },
            products: {
                total: totalProducts,
                lowStock: lowStockProducts,
            },
            users: {
                total: totalUsers,
                newToday: newUsersToday,
            },
            contacts: {
                unread: unreadContacts,
            },
        };
    }

    /**
     * Get all orders with pagination
     */
    async getAllOrders(page = 1, limit = 20, status?: string) {
        const skip = (page - 1) * limit;
        const where = status ? { status: status as any } : {};

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: {
                    items: {
                        include: {
                            product: { select: { name: true, imageUrl: true } },
                        },
                    },
                    user: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            orders,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get recent activity (audit logs)
     */
    async getRecentActivity(limit = 20) {
        return this.prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Get content stats
     */
    async getContentStats() {
        const [riddles, tips, facts] = await Promise.all([
            this.prisma.dailyContent.count({ where: { type: 'RIDDLE' } }),
            this.prisma.dailyContent.count({ where: { type: 'HEALTH_TIP' } }),
            this.prisma.dailyContent.count({ where: { type: 'FRUIT_FACT' } }),
        ]);

        return { riddles, tips, facts };
    }

    /**
     * Get AI usage stats
     */
    async getAiStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalChats, todayChats] = await Promise.all([
            this.prisma.aiChatHistory.count(),
            this.prisma.aiChatHistory.count({ where: { createdAt: { gte: today } } }),
        ]);

        return { totalChats, todayChats };
    }
}
