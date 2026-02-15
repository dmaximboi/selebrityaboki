/**
 * Security Interceptor
 * 
 * Adds security headers and recursively sanitizes responses
 * to prevent PII and sensitive data leakage
 */

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SecurityInterceptor implements NestInterceptor {
    private readonly sensitiveFields = new Set([
        'password',
        'passwordHash',
        'refreshToken',
        'googleId',
        'paymentSecret',
        'stripeId',
        'secretKey',
    ]);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const response = context.switchToHttp().getResponse();

        // Add security headers
        response.header('X-Content-Type-Options', 'nosniff');
        response.header('X-Frame-Options', 'DENY');
        response.header('X-XSS-Protection', '1; mode=block');
        response.header('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.header(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=()'
        );

        return next.handle().pipe(
            map((data) => {
                if (data && typeof data === 'object') {
                    return this.sanitizeResponse(data);
                }
                return data;
            })
        );
    }

    /**
     * Recursively sanitize response data, stripping sensitive fields
     * from all levels of nesting including arrays and nested objects
     */
    private sanitizeResponse(data: any): any {
        if (!data || typeof data !== 'object') return data;

        if (Array.isArray(data)) {
            return data.map((item) => this.sanitizeResponse(item));
        }

        const sanitized = { ...data };

        for (const key of Object.keys(sanitized)) {
            // Remove sensitive fields
            if (this.sensitiveFields.has(key)) {
                delete sanitized[key];
                continue;
            }

            // Recurse into nested objects and arrays
            if (sanitized[key] && typeof sanitized[key] === 'object') {
                sanitized[key] = this.sanitizeResponse(sanitized[key]);
            }
        }

        return sanitized;
    }
}
