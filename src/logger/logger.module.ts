import {
  Module,
  Global,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './winston.config';
import { RequestIdMiddleware } from 'src/logger/request-id.middleware';
import { SystemLogger } from 'src/logger/system-logger.service';
import { HttpLogger } from 'src/logger/http-logger.service';

@Global()
@Module({
  imports: [WinstonModule.forRoot(winstonConfig)],
  providers: [HttpLogger, SystemLogger],
  exports: [HttpLogger, SystemLogger],
})
export class LoggerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: '*splat', method: RequestMethod.ALL });
  }
}
