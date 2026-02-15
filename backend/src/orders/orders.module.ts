import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ReferralsModule } from '../referrals/referrals.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
    imports: [ReferralsModule, PromotionsModule],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }
