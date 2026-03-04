import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const SENSITIVE = new Set([
    'password', 'passwordHash', 'refreshToken', 'googleId',
    'paymentSecret', 'stripeId', 'secretKey', 'flwSecretKey',
    'webhookHash', 'jwtSecret', 'dbUrl',
]);

function redact(data: any, visited = new WeakSet(), depth = 0): any {
    if (!data || typeof data !== 'object') return data;
    if (depth >= 10) return undefined;
    if (visited.has(data)) return undefined;
    visited.add(data);

    if (data.constructor?.name === 'Decimal') return data;
    if (data instanceof Date) return data;

    if (Array.isArray(data)) {
        return data.map(item => redact(item, visited, depth + 1));
    }

    const safe: Record<string, any> = {};
    for (const key of Object.keys(data)) {
        if (SENSITIVE.has(key)) continue;
        safe[key] = redact(data[key], visited, depth + 1);
    }
    return safe;
}

@Injectable()
export class SecurityInterceptor implements NestInterceptor {
    private readonly logger = new Logger(SecurityInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const res = context.switchToHttp().getResponse();

        res.header('X-Content-Type-Options', 'nosniff');
        res.header('X-Frame-Options', 'DENY');
        res.header('X-XSS-Protection', '1; mode=block');
        res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.header('Pragma', 'no-cache');

        return next.handle().pipe(
            map(data => {
                if (data && typeof data === 'object') {
                    return redact(data);
                }
                return data;
            }),
        );
    }
}
