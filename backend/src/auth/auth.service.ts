import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes, createHash } from 'crypto';

interface TokenPayload {
    sub: string;
    email: string;
    role: string;
}

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private config: ConfigService
    ) { }

    async validateGoogleUser(profile: any) {
        const { email, firstName, lastName, picture } = profile;

        let user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            const adminEmails = this.config.get<string>('ADMIN_EMAILS')?.split(',').map(e => e.trim()) || [];
            const role = adminEmails.includes(email) ? 'ADMIN' : 'USER';

            user = await this.prisma.user.create({
                data: {
                    email,
                    name: `${firstName} ${lastName}`,
                    avatar: picture,
                    role,
                    referralCode: randomBytes(4).toString('hex').toUpperCase(),
                },
            });
        }

        if (!user.isActive) {
            throw new ForbiddenException('Account has been deactivated');
        }

        return user;
    }

    async googleLogin(profile: any, ipAddress: string) {
        const user = await this.validateGoogleUser(profile);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                lastLoginIp: ipAddress,
            },
        });

        const tokens = await this.generateTokens(user);
        await this.createSession(user.id, tokens.refreshToken, ipAddress);

        return {
            user,
            ...tokens,
        };
    }

    async refreshTokens(refreshToken: string, ipAddress: string) {
        const hashedToken = this.hashToken(refreshToken);

        const session = await this.prisma.session.findUnique({
            where: { refreshToken: hashedToken },
        });

        if (!session || !session.isValid || session.expiresAt < new Date()) {
            throw new UnauthorizedException('Invalid or expired session');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: session.userId },
        });

        if (!user || !user.isActive) {
            throw new ForbiddenException('Account is inactive');
        }

        await this.prisma.session.update({
            where: { id: session.id },
            data: { isValid: false },
        });

        const tokens = await this.generateTokens(user);
        await this.createSession(user.id, tokens.refreshToken, ipAddress);

        return tokens;
    }

    async logout(refreshToken: string) {
        const hashedToken = this.hashToken(refreshToken);
        await this.prisma.session.updateMany({
            where: { refreshToken: hashedToken },
            data: { isValid: false },
        });
    }

    async logoutAll(userId: string) {
        await this.prisma.session.updateMany({
            where: { userId },
            data: { isValid: false },
        });
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                avatar: true,
            },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('User not found or inactive');
        }

        return user;
    }

    isAdmin(user: any): boolean {
        return user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
    }

    private async generateTokens(user: any) {
        const payload: TokenPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: '24h',
        });

        const refreshToken = randomBytes(32).toString('hex');

        return { accessToken, refreshToken };
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private async createSession(userId: string, refreshToken: string, ipAddress: string) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const hashedToken = this.hashToken(refreshToken);

        await this.prisma.session.create({
            data: {
                userId,
                refreshToken: hashedToken,
                ipAddress,
                expiresAt,
            },
        });
    }
}
