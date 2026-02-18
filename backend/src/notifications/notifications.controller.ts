import {
    Controller,
    Post,
    Delete,
    Get,
    Body,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SubscribeDto, SendNotificationDto } from './dto/subscribe.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    // ─── Public: Get VAPID public key ─────────────────────────────────────────
    @Public()
    @Get('vapid-public-key')
    getVapidPublicKey() {
        return this.notificationsService.getVapidPublicKey();
    }

    // ─── Public: Subscribe to push notifications ──────────────────────────────
    @Public()
    @Post('subscribe')
    @HttpCode(HttpStatus.OK)
    subscribe(@Body() dto: SubscribeDto, @Req() req: any) {
        const userAgent = req.headers['user-agent'];
        return this.notificationsService.subscribe(dto, userAgent);
    }

    // ─── Public: Unsubscribe ──────────────────────────────────────────────────
    @Public()
    @Delete('unsubscribe')
    @HttpCode(HttpStatus.OK)
    unsubscribe(@Body() body: { endpoint: string }) {
        return this.notificationsService.unsubscribe(body.endpoint);
    }

    // ─── Admin: Broadcast to all subscribers ─────────────────────────────────
    @Roles('ADMIN', 'SUPERADMIN')
    @Post('broadcast')
    broadcast(@Body() dto: SendNotificationDto) {
        return this.notificationsService.broadcast(dto);
    }
}
