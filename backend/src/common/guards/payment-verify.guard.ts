import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentOwnerGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const orderId = request.params?.id;

        if (!orderId) throw new ForbiddenException('Order ID required');

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: { userId: true, paymentStatus: true },
        });

        if (!order) throw new NotFoundException('Order not found');

        if (order.paymentStatus === 'SUCCESS') {
            throw new ForbiddenException('Order already paid');
        }

        if (!user || order.userId !== user.sub) {
            throw new ForbiddenException('You do not own this order');
        }

        return true;
    }
}
