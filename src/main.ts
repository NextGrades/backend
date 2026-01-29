import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { AllExceptionsFilter } from 'all-exceptions.filter';
import { Response } from 'express';
import { LoggerService, ValidationPipe, VersioningType } from '@nestjs/common';
import 'reflect-metadata';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston/dist/winston.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: ['error', 'warn', 'log'], // no 'log'
  });
  // Enable CORS for your frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'https://nextgrades.netlify.app'],
    credentials: true, // Allow cookies to be sent
  });

  // Use cookie-parser middleware
  // app.use(cookieParser());
  // Global ValidationPipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.getHttpAdapter().get('/health', (req, res: Response) => {
    res.status(200).json({
      status: 'ok',
      pid: process.pid,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Redirect requests from root to /api/v1
  app.getHttpAdapter().get('/', (req, res: Response) => {
    res.redirect('/api');
  });

  app.setGlobalPrefix('api');
  const logger = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);
  await app.listen(process.env.PORT ?? 7500);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
