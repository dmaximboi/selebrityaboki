/**
 * Authentication Controller
 *
 * Handles Google OAuth flow and token refresh.
 * Uses Express (res.cookie / res.clearCookie) — NOT Fastify.
 */

import {
    Controller,
    Get,
    Post,
    Req,
    Res,
    UseGuards,
    HttpCode,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService
    ) { }

    /**
     * Initiate Google OAuth flow
     */
    @Public()
    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth() {
        // Passport redirects to Google — nothing to do here
    }

    /**
     * Google OAuth callback
     */
    @Public()
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthCallback(
        @Req() req: Request,
        @Res() res: Response
    ) {
        const user = (req as any).user;
        const ipAddress = this.getClientIp(req);

        try {
            const result = await this.authService.googleLogin(user, ipAddress);
            const isProduction = this.configService.get('NODE_ENV') === 'production';
            const frontendUrl = this.configService.get('FRONTEND_URL');

            // Set HTTP-only refresh token cookie on this domain (render.com)
            // SameSite=none + Secure so it can be sent cross-origin from Vercel
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'none' : 'lax',
                path: '/',
                maxAge: 3 * 24 * 60 * 60 * 1000, // 3-day sliding window
            });

            // Pass access token in the redirect URL — cookies are domain-scoped
            // and can't be read by JS on a different origin (render.com ≠ vercel.app)
            const encodedToken = encodeURIComponent(result.accessToken);
            const callbackPath = this.authService.isAdmin(result.user)
                ? '/selebme'
                : '/auth/callback';

            return res.redirect(`${frontendUrl}${callbackPath}?t=${encodedToken}`);
        } catch (error: any) {
            this.logger.error(
                `Google callback failed: ${error?.message}`,
                error?.stack,
            );

            const frontendUrl = this.configService.get('FRONTEND_URL');
            return res.redirect(`${frontendUrl}/auth/error?code=AUTH_FAILED`);
        }
    }

    /**
     * Refresh access token using cookie
     */
    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Req() req: Request, @Res() res: Response) {
        const refreshToken = (req as any).cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token not found' });
        }

        try {
            const ipAddress = this.getClientIp(req);
            const tokens = await this.authService.refreshTokens(refreshToken, ipAddress);
            const isProduction = this.configService.get('NODE_ENV') === 'production';

            res.cookie('refreshToken', tokens.refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'none' : 'lax',
                path: '/',
                maxAge: 3 * 24 * 60 * 60 * 1000, // 3-day sliding window
            });

            return res.json({ accessToken: tokens.accessToken });
        } catch (error: any) {
            return res.status(401).json({ message: error.message || 'Invalid refresh token' });
        }
    }

    /**
     * Logout — clear cookies and invalidate session
     */
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: Request, @Res() res: Response) {
        const refreshToken = (req as any).cookies?.refreshToken;

        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }

        res.clearCookie('refreshToken', { path: '/' });
        return res.json({ message: 'Logged out successfully' });
    }

    /**
     * Logout from all devices
     */
    @Post('logout-all')
    @HttpCode(HttpStatus.OK)
    async logoutAll(
        @CurrentUser('id') userId: string,
        @Res() res: Response
    ) {
        await this.authService.logoutAll(userId);
        res.clearCookie('refreshToken', { path: '/' });
        return res.json({ message: 'Logged out from all devices' });
    }

    /**
     * Get current user info
     */
    @Get('me')
    async getMe(@CurrentUser() user: any) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
        };
    }

    private getClientIp(req: Request): string {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }
        return req.ip || 'unknown';
    }
}
