/**
 * Referrals Service
 * 
 * Handles referral code generation, tracking, and reward eligibility.
 * All discount calculations are server-side — frontend never controls amounts.
 */

import {
    Injectable,
    BadRequestException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class ReferralsService {
    private readonly logger = new Logger(ReferralsService.name);
    private readonly REFERRAL_THRESHOLD = 3;    // 3 completed referrals needed
    private readonly DISCOUNT_PERCENT = 15;     // 15% discount reward

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Generate a unique referral code for a user (if they don't have one)
     */
    async generateReferralCode(userId: string): Promise<string> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { referralCode: true },
        });

        if (user?.referralCode) {
            return user.referralCode;
        }

        // Generate crypto-random 8-char alphanumeric code
        let code: string;
        let isUnique = false;

        while (!isUnique) {
            code = randomBytes(4).toString('hex').toUpperCase();
            const existing = await this.prisma.user.findUnique({
                where: { referralCode: code },
            });
            if (!existing) isUnique = true;
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { referralCode: code! },
        });

        this.logger.log(`Referral code generated for user ${userId}: ${code!}`);
        return code!;
    }

    /**
     * Apply a referral code — links the referred user to the referrer
     * Security: prevents self-referral and duplicate referrals
     */
    async applyReferralCode(referredUserId: string, code: string) {
        // Find referrer by code
        const referrer = await this.prisma.user.findUnique({
            where: { referralCode: code },
        });

        if (!referrer) {
            throw new NotFoundException('Invalid referral code');
        }

        // Prevent self-referral
        if (referrer.id === referredUserId) {
            throw new BadRequestException('You cannot use your own referral code');
        }

        // Check if user was already referred
        const existingReferral = await this.prisma.referral.findUnique({
            where: { referredUserId },
        });

        if (existingReferral) {
            throw new BadRequestException('You have already been referred');
        }

        // Create the referral link
        const referral = await this.prisma.referral.create({
            data: {
                referrerId: referrer.id,
                referredUserId,
                discountPercent: this.DISCOUNT_PERCENT,
            },
        });

        this.logger.log(`Referral applied: ${referrer.id} -> ${referredUserId}`);
        return { success: true, referralId: referral.id };
    }

    /**
     * Mark a referral as completed when the referred user makes a purchase
     * Called internally by OrdersService
     */
    async completeReferral(referredUserId: string, orderId: string) {
        const referral = await this.prisma.referral.findUnique({
            where: { referredUserId },
        });

        if (!referral || referral.status !== 'PENDING') return;

        await this.prisma.referral.update({
            where: { id: referral.id },
            data: {
                status: 'COMPLETED',
                completedOrderId: orderId,
            },
        });

        this.logger.log(`Referral completed: ${referral.referrerId} <- order ${orderId}`);
    }

    /**
     * Check if a user has earned a referral discount
     * Returns discount info if eligible, null otherwise
     */
    async checkReferralReward(userId: string): Promise<{
        eligible: boolean;
        completedCount: number;
        discountPercent: number;
    }> {
        const completedCount = await this.prisma.referral.count({
            where: {
                referrerId: userId,
                status: { in: ['COMPLETED', 'REWARDED'] },
            },
        });

        // Count how many have been already rewarded
        const rewardedCount = await this.prisma.referral.count({
            where: {
                referrerId: userId,
                status: 'REWARDED',
            },
        });

        // Check if there are enough unrewarded completions
        const unrewardedCompleted = completedCount - rewardedCount;
        const eligible = unrewardedCompleted >= this.REFERRAL_THRESHOLD;

        return {
            eligible,
            completedCount,
            discountPercent: this.DISCOUNT_PERCENT,
        };
    }

    /**
     * Consume the referral reward (mark referrals as REWARDED)
     * Called when the discount is applied to an order
     */
    async consumeReward(userId: string) {
        const completedReferrals = await this.prisma.referral.findMany({
            where: {
                referrerId: userId,
                status: 'COMPLETED',
            },
            take: this.REFERRAL_THRESHOLD,
            orderBy: { createdAt: 'asc' },
        });

        if (completedReferrals.length < this.REFERRAL_THRESHOLD) return;

        // Mark the first 3 as rewarded
        for (const referral of completedReferrals) {
            await this.prisma.referral.update({
                where: { id: referral.id },
                data: {
                    status: 'REWARDED',
                    rewardedAt: new Date(),
                },
            });
        }

        this.logger.log(`Referral reward consumed for user ${userId}`);
    }

    /**
     * Get referral stats for a user
     */
    async getMyStats(userId: string) {
        const [code, totalReferred, completed, pending] = await Promise.all([
            this.generateReferralCode(userId),
            this.prisma.referral.count({ where: { referrerId: userId } }),
            this.prisma.referral.count({
                where: { referrerId: userId, status: { in: ['COMPLETED', 'REWARDED'] } },
            }),
            this.prisma.referral.count({
                where: { referrerId: userId, status: 'PENDING' },
            }),
        ]);

        const reward = await this.checkReferralReward(userId);

        return {
            referralCode: code,
            totalReferred,
            completed,
            pending,
            rewardEligible: reward.eligible,
            discountPercent: reward.discountPercent,
            threshold: this.REFERRAL_THRESHOLD,
            remaining: Math.max(0, this.REFERRAL_THRESHOLD - (completed % this.REFERRAL_THRESHOLD)),
        };
    }
}
