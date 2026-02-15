/**
 * SelebrityAboki Fruit Backend - Main Entry Point
 * 
 * Security Layers Implemented:
 * 1. Helmet - HTTP Security Headers
 * 2. CORS Whitelist - Only trusted origins
 * 3. Rate Limiting - Prevent abuse
 * 4. Validation Pipe - Input sanitization
 * 5. Cookie Security - HTTP-only, Secure, SameSite
 */

import { NestFactory } from '@nestjs/core';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';

async function bootstrap() {
    // Use Fastify for ~30k req/sec performance
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({
            logger: process.env.NODE_ENV !== 'production',
            trustProxy: true, // For rate limiting behind proxy
        })
    );

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
                maxAge: 31536000, // 1 year
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
        'https://selebrityaboki.com', // Proper production domain
        'https://www.selebrityaboki.com',
    ].filter(Boolean) as string[];

    app.enableCors({
        origin: (origin, callback) => {
            // Allow local dev origins
            if (process.env.NODE_ENV !== 'production') {
                return callback(null, true);
            }
            // Strict match for production
            if (origin && allowedOrigins.includes(origin)) {
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
    await app.register(fastifyCookie, {
        secret: process.env.JWT_SECRET,
    });

    // ============================================
    // SECURITY LAYER 4: Global Validation Pipe
    // Strips unknown properties, validates DTOs
    // ============================================
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // Strip unknown properties
            forbidNonWhitelisted: true, // Throw on unknown properties
            transform: true, // Auto-transform to DTO types
            transformOptions: {
                enableImplicitConversion: true,
            },
            disableErrorMessages: process.env.NODE_ENV === 'production',
        })
    );

    // ============================================
    // SECURITY LAYER 5: Request Size Limit
    // Prevents buffer overflow attacks
    // ============================================
    app.getHttpAdapter().getInstance().register(require('@fastify/multipart'), {
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB max
            files: 5,
        },
    });

    // Global prefix for API routes
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
