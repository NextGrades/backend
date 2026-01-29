import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Response } from 'express';
import { LoggerService, ValidationPipe, VersioningType } from '@nestjs/common';
import 'reflect-metadata';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: ['error', 'warn', 'log'],
  });

  // CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'https://nextgrades.netlify.app'],
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Health check
  app.getHttpAdapter().get('/health', (req, res: Response) => {
    res.status(200).json({
      status: 'ok',
      pid: process.pid,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global API prefix
  app.setGlobalPrefix('api');

  // Root redirect → Swagger docs
  app.getHttpAdapter().get('/', (req, res: Response) => {
    res.redirect('/docs');
  });

  // Swagger config
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ngrades API')
    .setDescription(
      'This documentation covers the Ngrades API endpoints and serves as a demo for recruiters.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Swagger UI → /docs
  SwaggerModule.setup('docs', app, document);

  // Winston logger
  const logger = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const port = process.env.PORT ?? 7500;
  await app.listen(port);

  logger.log(`App running at: ${await app.getUrl()}`);
  logger.log(` Swagger docs at: ${await app.getUrl()}/docs`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
