/**
 * Admin Service
 *
 * Dashboard statistics and management operations.
 * All queries are parallel via Promise.all for performance.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { OrdersService } from '../orders/orders.service';

@Injectable()
export class AdminService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly ordersService: OrdersService
    ) { }

    /**
     * Get dashboard overview stats
     */
    async getDashboardStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const [
            totalOrders,
            todayOrders,
            pendingOrders,
            confirmedOrders,
            deliveredOrders,
            cancelledOrders,
            totalRevenue,
            monthRevenue,
            todayRevenue,
            totalProducts,
            lowStockProducts,
            totalUsers,
            newUsersToday,
            newUsersThisMonth,
            activeSessionsCount,
            unreadContacts,
            totalAiChats,
            todayAiChats,
        ] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.order.count({ where: { createdAt: { gte: today } } }),
            this.prisma.order.count({ where: { status: 'PENDING' } }),
            this.prisma.order.count({ where: { status: 'CONFIRMED' } }),
            this.prisma.order.count({ where: { status: 'DELIVERED' } }),
            this.prisma.order.count({ where: { status: 'CANCELLED' } }),
            this.prisma.order.aggregate({
                where: { paymentStatus: 'SUCCESS' },
                _sum: { totalAmount: true },
            }),
            this.prisma.order.aggregate({
                where: { paymentStatus: 'SUCCESS', createdAt: { gte: thisMonth } },
                _sum: { totalAmount: true },
            }),
            this.prisma.order.aggregate({
                where: { paymentStatus: 'SUCCESS', createdAt: { gte: today } },
                _sum: { totalAmount: true },
            }),
            this.prisma.product.count(),
            this.prisma.product.count({ where: { stock: { lt: 10 } } }),
            this.prisma.user.count(),
            this.prisma.user.count({ where: { createdAt: { gte: today } } }),
            this.prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
            this.prisma.session.count({ where: { isValid: true, expiresAt: { gt: new Date() } } }),
            this.prisma.contactSubmission.count({ where: { isRead: false } }),
            this.prisma.aiChatHistory.count(),
            this.prisma.aiChatHistory.count({ where: { createdAt: { gte: today } } }),
        ]);

        return {
            orders: {
                total: totalOrders,
                today: todayOrders,
                pending: pendingOrders,
                confirmed: confirmedOrders,
                delivered: deliveredOrders,
                cancelled: cancelledOrders,
                fulfillmentRate: totalOrders > 0
                    ? Math.round((deliveredOrders / totalOrders) * 100)
                    : 0,
            },
            revenue: {
                total: totalRevenue._sum.totalAmount?.toNumber() || 0,
                thisMonth: monthRevenue._sum.totalAmount?.toNumber() || 0,
                today: todayRevenue._sum.totalAmount?.toNumber() || 0,
            },
            products: {
                total: totalProducts,
                lowStock: lowStockProducts,
            },
            users: {
                total: totalUsers,
                newToday: newUsersToday,
                newThisMonth: newUsersThisMonth,
                activeSessions: activeSessionsCount,
            },
            contacts: {
                unread: unreadContacts,
            },
            ai: {
                totalChats: totalAiChats,
                todayChats: todayAiChats,
            },
        };
    }

    /**
     * Get AI usage stats — per-day breakdown (last 14 days)
     */
    async getAiAnalytics() {
        const days14 = new Date();
        days14.setDate(days14.getDate() - 14);

        const [totalChats, todayChats, topUsers, recentChats] = await Promise.all([
            this.prisma.aiChatHistory.count(),
            this.prisma.aiChatHistory.count({
                where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
            }),
            // Top users by AI usage (only authenticated users)
            this.prisma.aiChatHistory.groupBy({
                by: ['userId'],
                _count: { _all: true },
                orderBy: { _count: { userId: 'desc' } },
                take: 10,
                where: { userId: { not: undefined } },
            }),
            // Recent chats for table view (no include — groupBy doesn't support it)
            this.prisma.aiChatHistory.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
        ]);

        // Hydrate user names for top users
        const userIds = topUsers.map((u) => u.userId!).filter(Boolean);
        const userMap = userIds.length
            ? await this.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, email: true },
            })
            : [];

        const topUsersHydrated = topUsers.map((u) => {
            const user = userMap.find((m) => m.id === u.userId);
            return {
                userId: u.userId,
                name: user?.name || 'Guest',
                email: user?.email || '—',
                requests: u._count._all,
            };
        });

        return {
            totalChats,
            todayChats,
            topUsers: topUsersHydrated,
            recentChats,
        };
    }

    /**
     * Get login / sign-in analytics
     */
    async getLoginAnalytics() {
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        const thisMonth = new Date(now);
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const [
            totalLogins,
            loginsToday,
            loginsThisMonth,
            recentLoginSessions,
            activeSessions,
        ] = await Promise.all([
            this.prisma.session.count(),
            this.prisma.session.count({ where: { createdAt: { gte: today } } }),
            this.prisma.session.count({ where: { createdAt: { gte: thisMonth } } }),
            this.prisma.session.findMany({
                orderBy: { createdAt: 'desc' },
                take: 30,
            }),
            this.prisma.session.count({
                where: { isValid: true, expiresAt: { gt: now } },
            }),
        ]);

        // Hydrate user info for sessions
        const sessionUserIds = [...new Set(recentLoginSessions.map((s) => s.userId))];
        const sessionUsers = sessionUserIds.length
            ? await this.prisma.user.findMany({
                where: { id: { in: sessionUserIds } },
                select: { id: true, name: true, email: true, avatar: true },
            })
            : [];

        const recentLogins = recentLoginSessions.map((s) => ({
            ...s,
            user: sessionUsers.find((u) => u.id === s.userId) || null,
        }));

        return {
            totalLogins,
            loginsToday,
            loginsThisMonth,
            activeSessions,
            recentLogins,
        };
    }

    /**
     * Get all orders with pagination and filters
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
            orders: orders.map(o => ({
                ...o,
                whatsappUrl: this.ordersService.generateWhatsAppLink(o)
            })),
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
    async getRecentActivity(limit = 50) {
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
     * Get AI usage stats (simple - for dashboard card)
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
