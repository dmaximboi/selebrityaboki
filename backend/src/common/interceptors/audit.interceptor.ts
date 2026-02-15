/**
 * Audit Interceptor
 * 
 * Logs all admin actions to the database for security tracking
 */

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditInterceptor.name);

    constructor(private readonly prisma: PrismaService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const method = request.method;
        const url = request.url;

        // Only audit write operations from authenticated users
        if (!user || method === 'GET') {
            return next.handle();
        }

        const startTime = Date.now();

        return next.handle().pipe(
            tap({
                next: async (responseData) => {
                    // Log admin actions
                    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
                        try {
                            await this.prisma.auditLog.create({
                                data: {
                                    userId: user.id,
                                    userEmail: user.email,
                                    action: `${method} ${url}`,
                                    resource: this.extractResource(url),
                                    resourceId: request.params?.id || null,
                                    newValue: method !== 'DELETE' ? responseData : null,
                                    ipAddress: this.getClientIp(request),
                                    userAgent: request.headers['user-agent'] || 'unknown',
                                },
                            });
                        } catch (error) {
                            this.logger.error('Failed to create audit log', error);
                        }
                    }
                },
                error: (error) => {
                    this.logger.warn(
                        `Request failed: ${method} ${url} - ${error.message}`
                    );
                },
            })
        );
    }

    private extractResource(url: string): string {
        const parts = url.split('/').filter(Boolean);
        // Remove 'api' prefix and get resource name
        return parts[1] || 'unknown';
    }

    private getClientIp(request: any): string {
        return (
            request.headers['x-forwarded-for']?.split(',')[0] ||
            request.ip ||
            'unknown'
        );
    }
}
