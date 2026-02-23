/**
 * Content Service
 * 
 * Handles AI-generated content (riddles, tips, facts)
 * with scheduled auto-generation every 12 hours
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ContentType } from '@prisma/client';

@Injectable()
export class ContentService {
    private readonly logger = new Logger(ContentService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly aiService: AiService
    ) { }

    /**
     * Get latest content by type
     */
    async getLatest(type: ContentType, limit = 5) {
        return this.prisma.dailyContent.findMany({
            where: {
                type,
                isPublished: true,
            },
            orderBy: { publishedAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Get today's content
     */
    async getTodaysContent() {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        return this.prisma.dailyContent.findMany({
            where: {
                isPublished: true,
                publishedAt: { gte: startOfDay },
            },
            orderBy: { publishedAt: 'desc' },
        });
    }

    /**
     * Get content by ID and increment view count
     */
    async getById(id: string) {
        const content = await this.prisma.dailyContent.update({
            where: { id },
            data: { views: { increment: 1 } },
        });

        return content;
    }

    /**
     * Like content
     */
    async likeContent(id: string) {
        return this.prisma.dailyContent.update({
            where: { id },
            data: { likes: { increment: 1 } },
        });
    }

    /**
     * Manually trigger content generation (admin)
     */
    async generateNow(type: string) {
        const normalizedType = type.toUpperCase() as 'RIDDLE' | 'HEALTH_TIP' | 'FRUIT_FACT';
        return this.createContent(normalizedType);
    }

    // ============================================
    // SCHEDULED TASKS - Every 12 hours
    // ============================================

    @Cron(CronExpression.EVERY_12_HOURS)
    async generateDailyContent() {
        this.logger.log('Starting scheduled content generation...');

        try {
            // Generate 2 of each type
            const types: Array<'RIDDLE' | 'HEALTH_TIP' | 'FRUIT_FACT'> = [
                'RIDDLE',
                'HEALTH_TIP',
                'FRUIT_FACT',
            ];

            for (const type of types) {
                for (let i = 0; i < 2; i++) {
                    await this.createContent(type);
                    // Small delay to avoid rate limiting
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
            }

            this.logger.log('Content generation completed successfully');
        } catch (error) {
            this.logger.error(`Content generation failed: ${error.message}`);
        }
    }

    // ============================================
    // PRIVATE METHODS
    // ============================================

    private async createContent(type: 'RIDDLE' | 'HEALTH_TIP' | 'FRUIT_FACT') {
        const content = await this.aiService.generateContent(type);

        if (!content) {
            this.logger.warn(`Failed to generate ${type}`);
            return null;
        }

        return this.prisma.dailyContent.create({
            data: {
                type,
                content,
                isPublished: true,
                publishedAt: new Date(),
            },
        });
    }
}
