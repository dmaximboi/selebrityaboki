import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

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

    /**
     * Handle user from Google OAuth
     */
    async validateGoogleUser(profile: any) {
        const { email, firstName, lastName, picture } = profile;

        let user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Check if this is an admin email
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
            throw new ForbiddenException('Your account has been deactivated');
        }

        return user;
    }

    /**
     * Google OAuth login - generates tokens and creates session
     * Called by AuthController after Google callback
     */
    async googleLogin(profile: any, ipAddress: string) {
        const user = await this.validateGoogleUser(profile);

        // Update last login
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                lastLoginIp: ipAddress,
            },
        });

        // Generate tokens
        const tokens = await this.generateTokens(user);

        // Create session for refresh token tracking
        await this.createSession(user.id, tokens.refreshToken, ipAddress);

        return {
            user,
            ...tokens,
        };
    }

    /**
     * Refresh access token
     */
    async refreshTokens(refreshToken: string, ipAddress: string) {
        const hashedToken = await this.hashToken(refreshToken);

        const session = await this.prisma.session.findUnique({
            where: { refreshToken: hashedToken },
        });

        if (!session || !session.isValid || session.expiresAt < new Date()) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // Get user
        const user = await this.prisma.user.findUnique({
            where: { id: session.userId },
        });

        if (!user || !user.isActive) {
            throw new ForbiddenException('User account is inactive');
        }

        // Invalidate old session
        await this.prisma.session.update({
            where: { id: session.id },
            data: { isValid: false },
        });

        // Generate new tokens
        const tokens = await this.generateTokens(user);

        // Create new session
        await this.createSession(user.id, tokens.refreshToken, ipAddress);

        return tokens;
    }

    /**
     * Logout - invalidate session
     */
    async logout(refreshToken: string) {
        const hashedToken = await this.hashToken(refreshToken);
        await this.prisma.session.updateMany({
            where: { refreshToken: hashedToken },
            data: { isValid: false },
        });
    }

    /**
     * Logout from all devices
     */
    async logoutAll(userId: string) {
        await this.prisma.session.updateMany({
            where: { userId },
            data: { isValid: false },
        });
    }

    /**
     * Validate user by ID (used by JWT strategy)
     */
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

    /**
     * Check if user is admin
     */
    isAdmin(user: any): boolean {
        return user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
    }

    // ============================================
    // PRIVATE METHODS
    // ============================================

    private async generateTokens(user: any) {
        const payload: TokenPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload),
            this.generateRefreshToken(),
        ]);

        return { accessToken, refreshToken };
    }

    private async generateRefreshToken(): Promise<string> {
        return randomBytes(32).toString('hex');
    }

    /**
     * Hash token using SHA-256 for DB lookup
     */
    private async hashToken(token: string): Promise<string> {
        const { createHash } = await import('crypto');
        return createHash('sha256').update(token).digest('hex');
    }

    private async createSession(
        userId: string,
        refreshToken: string,
        ipAddress: string
    ) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        const hashedToken = await this.hashToken(refreshToken);

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
