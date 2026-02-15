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
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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
        @Req() req: FastifyRequest,
        @Res() res: FastifyReply
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

            // Securely hand off the access token via a temporary cookie
            // This prevents the token from appearing in URL logs or browser history
            res.setCookie('auth_token_handoff', result.accessToken, {
                httpOnly: false, // Frontend needs to read this Once
                secure: this.configService.get('NODE_ENV') === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 30, // 30 seconds expiration
            });

            const frontendUrl = this.configService.get('FRONTEND_URL');
            const redirectUrl = this.authService.isAdmin(result.user)
                ? `${frontendUrl}/selebme`
                : `${frontendUrl}/auth/callback`;

            return res.redirect(redirectUrl);
        } catch (error) {
            const frontendUrl = this.configService.get('FRONTEND_URL');
            return res.redirect(`${frontendUrl}/auth/error?message=${error.message}`);
        }
    }

    /**
     * Refresh access token
     */
    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshToken(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
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
    async logout(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
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
        @Res() res: FastifyReply
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

    private getClientIp(req: FastifyRequest): string {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }
        return req.ip || 'unknown';
    }
}
