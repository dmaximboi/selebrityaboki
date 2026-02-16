/**
 * Payment Webhook Controller
 * 
 * Handles Flutterwave webhooks with hash verification.
 * NEVER trust the frontend payment response - only trust webhooks.
 */

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
import { FastifyRequest } from 'fastify';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('webhooks')
@Public() // Webhooks don't use JWT - they use hash verification
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(
        private readonly ordersService: OrdersService,
        private readonly configService: ConfigService
    ) { }

    /**
     * Flutterwave webhook handler
     * Verifies using the secret hash configured in Flutterwave dashboard
     */
    @Post('flutterwave')
    @HttpCode(HttpStatus.OK)
    async handleFlutterwaveWebhook(
        @Headers('verif-hash') verifHash: string,
        @Body() body: any,
        @Req() req: FastifyRequest
    ) {
        // 1. VERIFY HASH
        const secretHash = this.configService.get('FLW_WEBHOOK_HASH');

        if (!verifHash || verifHash !== secretHash) {
            this.logger.warn(
                `Invalid Flutterwave webhook hash from IP: ${req.ip}`
            );
            throw new UnauthorizedException('Invalid webhook hash');
        }

        // 2. PROCESS EVENT
        const event = body.event;
        const data = body.data;

        this.logger.log(`Flutterwave webhook: ${event} | tx_ref: ${data?.tx_ref}`);

        switch (event) {
            case 'charge.completed':
                if (data.status === 'successful') {
                    // Verify the transaction server-side before confirming
                    await this.ordersService.verifyAndConfirmPayment(
                        data.tx_ref,
                        data.id, // Flutterwave transaction ID
                        data.amount,
                    );
                } else {
                    this.logger.warn(`Payment not successful: ${data.tx_ref} - status: ${data.status}`);
                }
                break;

            case 'transfer.completed':
                this.logger.log(`Transfer completed: ${data.id}`);
                break;

            default:
                this.logger.log(`Unhandled webhook event: ${event}`);
        }

        return { status: 'success' };
    }
}
