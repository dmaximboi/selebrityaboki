/**
 * Payment Webhook Controller
 * 
 * Handles payment provider webhooks with cryptographic verification.
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
import { createHmac } from 'crypto';
import { OrdersService } from '../orders/orders.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('webhooks')
@Public() // Webhooks don't use JWT - they use signature verification
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(
        private readonly ordersService: OrdersService,
        private readonly configService: ConfigService
    ) { }

    /**
     * Paystack webhook handler
     * Verifies signature using HMAC SHA-512
     */
    @Post('paystack')
    @HttpCode(HttpStatus.OK)
    async handlePaystackWebhook(
        @Headers('x-paystack-signature') signature: string,
        @Body() body: any,
        @Req() req: FastifyRequest
    ) {
        // 1. VERIFY SIGNATURE (Cryptographic)
        const secret = this.configService.get('PAYSTACK_SECRET_KEY');
        const hash = createHmac('sha512', secret)
            .update(JSON.stringify(body))
            .digest('hex');

        if (hash !== signature) {
            this.logger.warn(
                `Invalid webhook signature from IP: ${req.ip}`
            );
            throw new UnauthorizedException('Invalid signature');
        }

        // 2. PROCESS EVENT
        const event = body.event;
        const data = body.data;

        this.logger.log(`Webhook received: ${event}`);

        switch (event) {
            case 'charge.success':
                await this.ordersService.handlePaymentSuccess(
                    data.reference,
                    data.amount / 100 // Paystack sends amount in kobo
                );
                break;

            case 'charge.failed':
                this.logger.warn(`Payment failed: ${data.reference}`);
                break;

            default:
                this.logger.log(`Unhandled webhook event: ${event}`);
        }

        return { received: true };
    }
}
