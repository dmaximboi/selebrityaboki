import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

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

import { SecurityInterceptor } from './common/interceptors/security.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { SanitizeMiddleware } from './common/middleware/sanitize.middleware';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        ThrottlerModule.forRoot([
            {
                name: 'short',
                ttl: 1000,
                limit: 10,
            },
            {
                name: 'medium',
                ttl: 60000,
                limit: 100,
            },
            {
                name: 'long',
                ttl: 3600000,
                limit: 1000,
            },
        ]),

        ScheduleModule.forRoot(),

        PrismaModule,
        AuthModule,
        HealthModule,
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
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
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
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(SanitizeMiddleware)
            .exclude(
                { path: 'api/webhooks/flutterwave', method: RequestMethod.POST },
                { path: 'health', method: RequestMethod.GET },
            )
            .forRoutes({ path: 'api/*', method: RequestMethod.ALL });
    }
}
