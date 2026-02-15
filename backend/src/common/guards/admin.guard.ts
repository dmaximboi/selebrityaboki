/**
 * Admin Guard
 * 
 * Special guard for admin routes - checks email whitelist from DB
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new UnauthorizedException('Authentication required');
        }

        // Check if user exists and has admin role
        const dbUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, isActive: true, email: true },
        });

        if (!dbUser) {
            throw new UnauthorizedException('User not found');
        }

        if (!dbUser.isActive) {
            throw new ForbiddenException('Account has been deactivated');
        }

        if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPERADMIN') {
            // Log suspicious access attempt
            console.warn(
                `[SECURITY] Unauthorized admin access attempt by: ${dbUser.email}`
            );
            throw new ForbiddenException('Admin access required');
        }

        return true;
    }
}
