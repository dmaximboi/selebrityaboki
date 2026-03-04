import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE|SCRIPT|DECLARE|CAST|CONVERT|CHAR|NCHAR|VARCHAR|NVARCHAR|XP_|SP_)\b)/i;
const NULL_BYTE_PATTERN = /\0/;
const PATH_TRAVERSAL_PATTERN = /\.\.(\/|\\)/;
const LOG_INJECTION_PATTERN = /[\r\n]/;

function deepSanitize(value: any, depth = 0): boolean {
    if (depth > 10) return false;

    if (typeof value === 'string') {
        if (NULL_BYTE_PATTERN.test(value)) return false;
        if (PATH_TRAVERSAL_PATTERN.test(value)) return false;
        if (LOG_INJECTION_PATTERN.test(value)) return false;
        if (SQL_INJECTION_PATTERN.test(value) && value.length > 20) return false;
    }

    if (Array.isArray(value)) {
        return value.every(v => deepSanitize(v, depth + 1));
    }

    if (value && typeof value === 'object') {
        return Object.values(value).every(v => deepSanitize(v, depth + 1));
    }

    return true;
}

@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction) {
        if (req.body && typeof req.body === 'object') {
            if (!deepSanitize(req.body)) {
                throw new BadRequestException('Malicious input detected');
            }
        }

        if (req.query && typeof req.query === 'object') {
            for (const val of Object.values(req.query)) {
                if (typeof val === 'string') {
                    if (NULL_BYTE_PATTERN.test(val) || PATH_TRAVERSAL_PATTERN.test(val)) {
                        throw new BadRequestException('Malicious query parameter detected');
                    }
                }
            }
        }

        next();
    }
}
