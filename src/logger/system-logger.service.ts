import { Injectable, LoggerService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class SystemLogger implements LoggerService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  private build(message: unknown, context?: string) {
    return {
      message,
      context,
      scope: 'system',
    };
  }

  log(message: any, context?: string) {
    this.logger.log(this.build(message, context));
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error({
      ...this.build(message, context),
      trace,
    });
  }

  warn(message: any, context?: string) {
    this.logger.warn(this.build(message, context));
  }

  debug(message: any, context?: string) {
    this.logger.debug?.(this.build(message, context));
  }
}
