import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  // No HTTP server created
  await NestFactory.createApplicationContext(WorkerModule);
  console.log('Worker started and listening for jobs...');
}
bootstrap().catch((error) => {
  console.error('Worker failed to start:', error);
  process.exit(1);
});
