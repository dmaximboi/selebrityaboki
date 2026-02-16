/**
 * Authentication Controller
 * 
 * Handles OAuth flow and token refresh
 */

import {
    Controller,
    Get,
    Post,
    Body,
    Req,
    Res,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Use `any` for req/res types since @fastify/cookie extends them at runtime
type CookieRequest = any;
type CookieReply = any;

@Controller('auth')
export class AuthController {
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
        // Guard redirects to Google
    }

    /**
     * Google OAuth callback
     */
    @Public()
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthCallback(
        @Req() req: CookieRequest,
        @Res() res: CookieReply
    ) {
        const user = req.user as any;
        const ipAddress = this.getClientIp(req);

        try {
            const result = await this.authService.googleLogin(user, ipAddress);

            // Set HTTP-only cookie for refresh token
            res.setCookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: this.configService.get('NODE_ENV') === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60, // 7 days
            });

            // Securely hand off the access token via a short-lived cookie
            // Frontend reads this ONCE in /auth/callback then deletes it
            res.setCookie('auth_token_handoff', result.accessToken, {
                httpOnly: false, // Frontend needs to read this once
                secure: this.configService.get('NODE_ENV') === 'production',
                sameSite: 'strict',
                path: '/auth/callback',
                maxAge: 10, // 10 seconds — extremely short window
            });

            const frontendUrl = this.configService.get('FRONTEND_URL');
            const redirectUrl = this.authService.isAdmin(result.user)
                ? `${frontendUrl}/selebme`
                : `${frontendUrl}/auth/callback`;

            return res.redirect(redirectUrl);
        } catch (error) {
            // NEVER leak error details in URLs - use generic error code
            const frontendUrl = this.configService.get('FRONTEND_URL');
            return res.redirect(`${frontendUrl}/auth/error?code=AUTH_FAILED`);
        }
    }

    /**
     * Refresh access token
     */
    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Req() req: CookieRequest, @Res() res: CookieReply) {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).send({ message: 'Refresh token not found' });
        }

        const ipAddress = this.getClientIp(req);
        const tokens = await this.authService.refreshTokens(refreshToken, ipAddress);

        // Update refresh token cookie
        res.setCookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: this.configService.get('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60,
        });

        return res.send({ accessToken: tokens.accessToken });
    }

    /**
     * Logout
     */
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: CookieRequest, @Res() res: CookieReply) {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }

        res.clearCookie('refreshToken', { path: '/' });
        return res.send({ message: 'Logged out successfully' });
    }

    /**
     * Logout from all devices
     */
    @Post('logout-all')
    @HttpCode(HttpStatus.OK)
    async logoutAll(
        @CurrentUser('id') userId: string,
        @Res() res: CookieReply
    ) {
        await this.authService.logoutAll(userId);

        res.clearCookie('refreshToken', { path: '/' });
        return res.send({ message: 'Logged out from all devices' });
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

    private getClientIp(req: CookieRequest): string {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }
        return req.ip || 'unknown';
    }
}
