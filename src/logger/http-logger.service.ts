import { Injectable, LoggerService, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class HttpLogger implements LoggerService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,

    @Inject(REQUEST)
    private readonly request: Request & { requestId?: string },
  ) {}

  private build(message: unknown, context?: string) {
    return {
      message,
      context,
      scope: 'http',
      requestId: this.request.requestId,
      method: this.request.method,
      url: this.request.originalUrl,
      ip: this.request.ip,
      userAgent: this.request.headers['user-agent'],
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
