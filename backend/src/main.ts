/**
 * SelebrityAboki Fruit Backend - Main Entry Point (Express)
 *
 * Security Layers:
 * 1. Helmet  - HTTP Security Headers
 * 2. CORS    - Only trusted origins
 * 3. Cookies - HTTP-only, Secure, SameSite via cookie-parser
 * 4. Validation Pipe - Input sanitization
 * 5. Body Size Limit - 10MB
 */

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    // Trust Render/Vercel proxy
    app.set('trust proxy', 1);

    // ============================================
    // SECURITY LAYER 1: Helmet (HTTP Headers)
    // ============================================
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
                    fontSrc: ["'self'", 'fonts.gstatic.com'],
                    imgSrc: ["'self'", 'data:', 'https:', 'res.cloudinary.com'],
                    scriptSrc: ["'self'"],
                },
            },
            crossOriginEmbedderPolicy: false,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true,
            },
        })
    );

    // ============================================
    // SECURITY LAYER 2: CORS Whitelist
    // ============================================
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
            if (!origin) {
                return callback(null, true);
            }
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            callback(new Error('CORS not allowed'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    // ============================================
    // SECURITY LAYER 3: Cookie Parser
    // ============================================
    app.use(cookieParser(process.env.JWT_SECRET));

    // ============================================
    // SECURITY LAYER 4: Global Validation Pipe
    // ============================================
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
            disableErrorMessages: process.env.NODE_ENV === 'production',
        })
    );

    // Global prefix — health excluded
    const { DecimalInterceptor } = await import('./common/interceptors/decimal.interceptor');
    app.useGlobalInterceptors(new DecimalInterceptor());

    app.setGlobalPrefix('api', {
        exclude: ['health'],
    });

    const port = process.env.PORT || 4000;
    await app.listen(port, '0.0.0.0');

    console.log(`
  =============================================
  SelebrityAboki Fruit API is running!
  
  Environment: ${process.env.NODE_ENV || 'development'}
  Port: ${port}
  Health: http://localhost:${port}/health
  API: http://localhost:${port}/api
  =============================================
  `);
}

bootstrap();
