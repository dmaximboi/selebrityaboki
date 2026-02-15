import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [OrdersModule],
    controllers: [WebhookController],
})
export class WebhookModule { }
