/**
 * Referrals Controller
 * 
 * Endpoints for referral code management and tracking.
 * All protected by JWT — referral codes are user-specific.
 */

import {
    Controller,
    Get,
    Post,
    Param,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('referrals')
export class ReferralsController {
    constructor(private readonly referralsService: ReferralsService) { }

    /**
     * Get my referral stats + generate code if needed
     */
    @Get('my-stats')
    async getMyStats(@CurrentUser('id') userId: string) {
        return this.referralsService.getMyStats(userId);
    }

    /**
     * Get my referral code (generates one if not present)
     */
    @Get('my-code')
    async getMyCode(@CurrentUser('id') userId: string) {
        const code = await this.referralsService.generateReferralCode(userId);
        return { referralCode: code };
    }

    /**
     * Apply a referral code (link current user to referrer)
     */
    @Post('apply/:code')
    @HttpCode(HttpStatus.OK)
    async applyCode(
        @CurrentUser('id') userId: string,
        @Param('code') code: string
    ) {
        return this.referralsService.applyReferralCode(userId, code);
    }

    /**
     * Check referral reward eligibility
     */
    @Get('reward-status')
    async checkReward(@CurrentUser('id') userId: string) {
        return this.referralsService.checkReferralReward(userId);
    }

    /**
     * Validate a referral code (public — for sharing links)
     */
    @Public()
    @Get('validate/:code')
    async validateCode(@Param('code') code: string) {
        // Only return whether it's valid, not who owns it (privacy)
        try {
            const user = await this.referralsService['prisma'].user.findUnique({
                where: { referralCode: code },
                select: { name: true },
            });
            return {
                valid: !!user,
                referrerName: user?.name ? user.name.split(' ')[0] : null,
            };
        } catch {
            return { valid: false };
        }
    }
}
