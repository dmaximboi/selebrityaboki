import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn', 'log'],
        rawBody: true,
    });

    app.set('trust proxy', 1);
    app.set('x-powered-by', false);

    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
                    fontSrc: ["'self'", 'fonts.gstatic.com'],
                    imgSrc: ["'self'", 'data:', 'https:', 'res.cloudinary.com', 'i.ibb.co'],
                    scriptSrc: ["'self'"],
                    connectSrc: ["'self'", 'https://api.flutterwave.com'],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                    upgradeInsecureRequests: [],
                },
            },
            crossOriginEmbedderPolicy: false,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true,
            },
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
            dnsPrefetchControl: { allow: false },
            permittedCrossDomainPolicies: { permittedPolicies: 'none' },
            hidePoweredBy: true,
        })
    );

    const allowedOrigins = [
        process.env.FRONTEND_URL,
        'https://selebrityaboki.com',
        'https://www.selebrityaboki.com',
        'http://localhost:3000',
    ].filter(Boolean) as string[];

    app.enableCors({
        origin: (origin, callback) => {
            if (process.env.NODE_ENV !== 'production') {
                return callback(null, true);
            }
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            callback(new Error('CORS not allowed'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        maxAge: 86400,
    });

    app.use(cookieParser(process.env.COOKIE_SECRET || process.env.JWT_SECRET));

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
            disableErrorMessages: process.env.NODE_ENV === 'production',
            stopAtFirstError: true,
        })
    );

    const { DecimalInterceptor } = await import('./common/interceptors/decimal.interceptor');
    app.useGlobalInterceptors(new DecimalInterceptor());

    app.setGlobalPrefix('api', { exclude: ['health'] });

    const port = process.env.PORT || 4000;
    await app.listen(port, '0.0.0.0');

    if (process.env.NODE_ENV !== 'production') {
        console.log(`API running on port ${port}`);
    }
}

bootstrap();
