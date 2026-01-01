import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from 'all-exceptions.filter';
import { Response } from 'express';
import { ValidationPipe } from '@nestjs/common';
import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS for your frontend
  app.enableCors({
    origin: ['http://localhost:5173'],
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
  const { httpAdapter } = app.get(HttpAdapterHost);

  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  // Redirect requests from root to /api/v1
  app.getHttpAdapter().get('/', (req, res: Response) => {
    res.redirect('/api/v1');
  });

  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.PORT ?? 7500);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
