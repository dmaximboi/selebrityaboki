import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateContactDto {
    name: string;
    email: string;
    phone?: string;
    message: string;
}

@Injectable()
export class ContactService {
    private readonly logger = new Logger(ContactService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Submit contact form
     */
    async submit(dto: CreateContactDto, ipAddress: string, userAgent?: string) {
        // Check for spam (same IP, multiple submissions within 1 minute)
        const recentSubmission = await this.prisma.contactSubmission.findFirst({
            where: {
                ipAddress,
                createdAt: {
                    gte: new Date(Date.now() - 60000), // 1 minute
                },
            },
        });

        if (recentSubmission) {
            throw new BadRequestException(
                'Please wait a moment before sending another message'
            );
        }

        // Create submission
        const submission = await this.prisma.contactSubmission.create({
            data: {
                ...dto,
                ipAddress,
                userAgent,
            },
        });

        this.logger.log(`New contact submission from: ${dto.email}`);

        return {
            success: true,
            message: 'Thank you for your message. We will get back to you soon.',
        };
    }

    /**
     * Get all submissions (admin)
     */
    async findAll(options?: { unreadOnly?: boolean }) {
        const where = options?.unreadOnly ? { isRead: false } : {};

        return this.prisma.contactSubmission.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Mark as read (admin)
     */
    async markAsRead(id: string) {
        return this.prisma.contactSubmission.update({
            where: { id },
            data: { isRead: true },
        });
    }

    /**
     * Mark as spam and delete (admin)
     */
    async markAsSpam(id: string) {
        return this.prisma.contactSubmission.update({
            where: { id },
            data: { isSpam: true },
        });
    }

    /**
     * Delete submission (admin)
     */
    async delete(id: string) {
        await this.prisma.contactSubmission.delete({
            where: { id },
        });
        return { success: true };
    }

    /**
     * Get unread count (admin)
     */
    async getUnreadCount() {
        return this.prisma.contactSubmission.count({
            where: { isRead: false, isSpam: false },
        });
    }
}
