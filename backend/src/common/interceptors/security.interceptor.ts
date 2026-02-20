/**
 * Security Interceptor
 * 
 * Adds security headers and recursively sanitizes responses
 * to prevent PII and sensitive data leakage.
 * Handles circular references in Prisma objects safely.
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

    private readonly MAX_DEPTH = 10;

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
                    return this.sanitizeResponse(data, new WeakSet(), 0);
                }
                return data;
            })
        );
    }

    /**
     * Recursively sanitize response data, stripping sensitive fields.
     * Uses a WeakSet to detect circular references and a depth limit
     * to prevent stack overflow on Prisma objects.
     */
    private sanitizeResponse(data: any, visited: WeakSet<object>, depth: number): any {
        if (!data || typeof data !== 'object') return data;

        // Stop at max depth to prevent stack overflow
        if (depth >= this.MAX_DEPTH) return undefined;

        // Detect circular references
        if (visited.has(data)) return undefined;
        visited.add(data);

        if (Array.isArray(data)) {
            return data.map((item) => this.sanitizeResponse(item, visited, depth + 1));
        }

        // Handle Decimal/BigInt/Date objects — don't recurse into them
        if (data.constructor && data.constructor.name === 'Decimal') return data;
        if (data instanceof Date) return data;

        const sanitized = { ...data };

        for (const key of Object.keys(sanitized)) {
            // Remove sensitive fields
            if (this.sensitiveFields.has(key)) {
                delete sanitized[key];
                continue;
            }

            // Recurse into nested objects and arrays
            if (sanitized[key] && typeof sanitized[key] === 'object') {
                sanitized[key] = this.sanitizeResponse(sanitized[key], visited, depth + 1);
            }
        }

        return sanitized;
    }
}
