import { Injectable, LoggerService, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class RequestLoggerService implements LoggerService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,

    @Inject(REQUEST)
    private readonly request: Request & { requestId?: string },
  ) {}

  private get contextMeta() {
    return {
      requestId: this.request.requestId,
      method: this.request.method,
      url: this.request.originalUrl,
    };
  }

  log(message: any, context?: string) {
    this.logger.log(message, context ?? undefined, this.contextMeta);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, trace, context ?? undefined, this.contextMeta);
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, context ?? undefined, this.contextMeta);
  }

  debug(message: any, context?: string) {
    this.logger.debug?.(message, context ?? undefined, this.contextMeta);
  }

  verbose(message: any, context?: string) {
    this.logger.verbose?.(message, context ?? undefined, this.contextMeta);
  }
}
