import {
    Controller,
    Post,
    Headers,
    Body,
    Req,
    UnauthorizedException,
    Logger,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('webhooks')
@Public()
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(
        private readonly ordersService: OrdersService,
        private readonly configService: ConfigService
    ) { }

    @Post('flutterwave')
    @HttpCode(HttpStatus.OK)
    async handleFlutterwaveWebhook(
        @Headers('verif-hash') verifHash: string,
        @Body() body: any,
        @Req() req: Request
    ) {
        const secretHash = this.configService.get('FLW_WEBHOOK_HASH');

        if (!verifHash || !secretHash || verifHash !== secretHash) {
            this.logger.warn(`Rejected webhook from ${req.ip}`);
            throw new UnauthorizedException('Invalid webhook signature');
        }

        const event = body.event;
        const data = body.data;

        await this.ordersService.logPaymentAttempt({
            txRef: data?.tx_ref,
            transactionId: data?.id ? String(data.id) : undefined,
            status: data?.status || event,
            amount: data?.amount,
            currency: data?.currency,
            rawBody: body,
            ip: req.ip,
            userAgent: req.headers['user-agent'] as string,
        });

        switch (event) {
            case 'charge.completed':
                if (data.status === 'successful') {
                    await this.ordersService.verifyAndConfirmPayment(
                        data.tx_ref,
                        data.id,
                        data.amount,
                    );
                }
                break;

            case 'transfer.completed':
                this.logger.log(`Transfer completed: ${data.id}`);
                break;

            default:
                this.logger.log(`Unhandled webhook event type received`);
        }

        return { status: 'ok' };
    }
}
