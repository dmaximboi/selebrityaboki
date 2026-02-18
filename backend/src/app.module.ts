/**
 * SelebrityAboki Fruit - Main App Module
 * 
 * Configures all feature modules and global security
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

// Feature modules
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { AiModule } from './ai/ai.module';
import { ContentModule } from './content/content.module';
import { ContactModule } from './contact/contact.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { WebhookModule } from './webhooks/webhook.module';
import { ReferralsModule } from './referrals/referrals.module';
import { PromotionsModule } from './promotions/promotions.module';
import { NotificationsModule } from './notifications/notifications.module';

// Security
import { SecurityInterceptor } from './common/interceptors/security.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
    imports: [
        // ============================================
        // CONFIGURATION
        // ============================================
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: process.env.NODE_ENV === 'production' ? '.env' : '.env',
        }),

        // ============================================
        // SECURITY LAYER 6: Rate Limiting
        // 100 requests per minute per IP
        // ============================================
        ThrottlerModule.forRoot([
            {
                name: 'short',
                ttl: 1000, // 1 second
                limit: 10, // 10 req/sec
            },
            {
                name: 'medium',
                ttl: 60000, // 1 minute
                limit: 100, // 100 req/min
            },
            {
                name: 'long',
                ttl: 3600000, // 1 hour
                limit: 1000, // 1000 req/hour
            },
        ]),

        // ============================================
        // SCHEDULED TASKS (AI Content Generation)
        // ============================================
        ScheduleModule.forRoot(),

        // ============================================
        // CORE MODULES
        // ============================================
        PrismaModule,
        AuthModule,
        HealthModule,

        // ============================================
        // FEATURE MODULES
        // ============================================
        UsersModule,
        ProductsModule,
        OrdersModule,
        AiModule,
        ContentModule,
        ContactModule,
        AdminModule,
        WebhookModule,
        ReferralsModule,
        PromotionsModule,
        NotificationsModule,
    ],
    providers: [
        // ============================================
        // GLOBAL GUARDS
        // ============================================
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },

        // ============================================
        // GLOBAL INTERCEPTORS
        // ============================================
        {
            provide: APP_INTERCEPTOR,
            useClass: SecurityInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: AuditInterceptor,
        },
    ],
})
export class AppModule { }
