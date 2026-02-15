import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                avatar: true,
                role: true,
                isActive: true,
                isVerified: true,
                lastLoginAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                avatar: true,
                role: true,
                isActive: true,
                isVerified: true,
                lastLoginAt: true,
                createdAt: true,
                orders: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async updateProfile(id: string, data: { name?: string; phone?: string }) {
        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                avatar: true,
                role: true,
            },
        });
    }

    async setUserRole(id: string, role: 'USER' | 'ADMIN') {
        return this.prisma.user.update({
            where: { id },
            data: { role },
        });
    }

    async deactivateUser(id: string) {
        return this.prisma.user.update({
            where: { id },
            data: { isActive: false },
        });
    }

    async activateUser(id: string) {
        return this.prisma.user.update({
            where: { id },
            data: { isActive: true },
        });
    }

    async getStats() {
        const [totalUsers, activeUsers, admins] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { isActive: true } }),
            this.prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPERADMIN'] } } }),
        ]);

        return { totalUsers, activeUsers, admins };
    }
}
