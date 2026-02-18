import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeDto, SendNotificationDto } from './dto/subscribe.dto';

@Injectable()
export class NotificationsService implements OnModuleInit {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private readonly prisma: PrismaService) { }

    onModuleInit() {
        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        const email = process.env.VAPID_EMAIL || 'mailto:admin@selebrityaboki.com';

        if (!publicKey || !privateKey) {
            this.logger.warn('VAPID keys not set — push notifications disabled');
            return;
        }

        webpush.setVapidDetails(email, publicKey, privateKey);
        this.logger.log('Web Push (VAPID) initialized');
    }

    // ─── Subscribe ───────────────────────────────────────────────────────────

    async subscribe(dto: SubscribeDto, userAgent?: string) {
        const { endpoint, keys, userId } = dto;

        const subscription = await this.prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                p256dh: keys.p256dh,
                auth: keys.auth,
                userId: userId ?? null,
                userAgent: userAgent ?? null,
            },
            create: {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                userId: userId ?? null,
                userAgent: userAgent ?? null,
            },
        });

        this.logger.log(`New push subscription saved: ${subscription.id}`);
        return { success: true, id: subscription.id };
    }

    // ─── Unsubscribe ─────────────────────────────────────────────────────────

    async unsubscribe(endpoint: string) {
        await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
        return { success: true };
    }

    // ─── Send to one endpoint ─────────────────────────────────────────────────

    async sendToEndpoint(
        endpoint: string,
        p256dh: string,
        auth: string,
        payload: SendNotificationDto,
    ) {
        try {
            await webpush.sendNotification(
                { endpoint, keys: { p256dh, auth } },
                JSON.stringify({
                    title: payload.title,
                    body: payload.body,
                    icon: payload.icon ?? '/icons/icon-192.png',
                    badge: '/icons/icon-192.png',
                    url: payload.url ?? '/',
                    tag: payload.tag ?? 'selebrity-notification',
                }),
            );
        } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
                // Subscription expired — clean up
                await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
                this.logger.warn(`Removed expired subscription: ${endpoint}`);
            } else {
                this.logger.error(`Push failed for ${endpoint}: ${err.message}`);
            }
        }
    }

    // ─── Broadcast to all subscribers ────────────────────────────────────────

    async broadcast(payload: SendNotificationDto) {
        const subs = await this.prisma.pushSubscription.findMany();
        this.logger.log(`Broadcasting to ${subs.length} subscribers`);

        const results = await Promise.allSettled(
            subs.map((sub) =>
                this.sendToEndpoint(sub.endpoint, sub.p256dh, sub.auth, payload),
            ),
        );

        const failed = results.filter((r) => r.status === 'rejected').length;
        return { sent: subs.length - failed, failed };
    }

    // ─── Send to a specific user ──────────────────────────────────────────────

    async sendToUser(userId: string, payload: SendNotificationDto) {
        const subs = await this.prisma.pushSubscription.findMany({
            where: { userId },
        });

        await Promise.allSettled(
            subs.map((sub) =>
                this.sendToEndpoint(sub.endpoint, sub.p256dh, sub.auth, payload),
            ),
        );

        return { sent: subs.length };
    }

    // ─── Get VAPID public key for frontend ────────────────────────────────────

    getVapidPublicKey() {
        return { publicKey: process.env.VAPID_PUBLIC_KEY ?? '' };
    }
}
