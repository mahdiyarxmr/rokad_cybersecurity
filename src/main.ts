import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import {
  isProduction,
  resolveCorsOrigins,
  SECURITY_TXT,
} from './common/security/security-policy';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { cors: false });
  const configService = app.get(ConfigService);
  const production = isProduction();
  const corsOrigins = resolveCorsOrigins();

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-tenant-id',
      'x-tenant-slug',
      'x-app-version',
      'X-App-Version',
      'Accept',
      'Range',
      'range',
      'Origin',
      'x-health-token',
    ],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
  });

  const enableSwagger = !production || configService.get<string>('ENABLE_SWAGGER') === 'true';

  app.use(
    helmet({
      contentSecurityPolicy: enableSwagger
        ? false
        : {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'blob:'],
              objectSrc: ["'none'"],
              frameAncestors: ["'self'"],
              baseUri: ["'self'"],
            },
          },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      hsts: production
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      frameguard: { action: 'sameorigin' },
      noSniff: true,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use(cookieParser());

  app.use('/.well-known/security.txt', (_req: any, res: any) => {
    res.type('text/plain; charset=utf-8').send(SECURITY_TXT);
  });

  app.use((_req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Vary', 'Authorization, Origin, x-tenant-id');
    next();
  });

  const jsonLimit = configService.get<string>('JSON_BODY_LIMIT', '6mb');
  app.use(json({ limit: jsonLimit }));
  app.use(urlencoded({ extended: true, limit: jsonLimit }));

  app.use((req: any, _res: any, next: any) => {
    if (req.url === '/health' || req.url.startsWith('/health/')) {
      req.url = '/api/v1' + req.url;
    }
    next();
  });

  app.setGlobalPrefix('api/v1', { exclude: ['/'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const redisIoAdapter = new RedisIoAdapter(app, configService);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('پلتفرم رکاد — سامانه چندمستأجری مدارس (Rokad Platform API)')
      .setDescription(
        'مستندات API پلتفرم رکاد. در production این صفحه به‌صورت پیش‌فرض خاموش است.',
      )
      .setVersion('1.1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'توکن دسترسی JWT',
          in: 'header',
        },
        'bearer',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: false,
        docExpansion: 'list',
        filter: true,
      },
      customSiteTitle: 'Rokad School API Docs',
    });
    logger.log('Swagger is enabled');
  } else {
    logger.log('Swagger is disabled');
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Rokad API listening on 0.0.0.0:${port}`);
}

bootstrap();
