import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ReferralsModule } from '../referrals/referrals.module';
import { PromotionsModule } from '../promotions/promotions.module';

import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule, ReferralsModule, PromotionsModule],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }
