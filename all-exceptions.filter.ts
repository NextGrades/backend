import {
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError, TypeORMError } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { handleTypeORMError } from 'src/utils/typeorm.util';
import { fail } from 'src/common/http/response.helpers';
import { ApiRequestError, ApiResponse } from 'src/common/http/api-response';

/* ---------------- POSTGRES ERROR SHAPE ---------------- */
interface PostgresError extends Error {
  code: string;
  detail?: string;
  table?: string;
  column?: string;
  constraint?: string;
}

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const env = this.configService.get<string>('NODE_ENV') ?? 'production';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let apiResponse: ApiResponse<null>;

    /* ---------------- DOMAIN ERROR ---------------- */
    if (exception instanceof ApiRequestError) {
      statusCode = exception.statusCode;
      apiResponse = fail(exception.message, exception.code, exception.details);
    } else if (exception instanceof HttpException) {
      /* ---------------- HTTP EXCEPTIONS ---------------- */
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      apiResponse = fail(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        typeof res === 'string'
          ? res
          : // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ((res as any)?.message ?? 'Request failed'),
        'HTTP_EXCEPTION',
        res,
      );
    } else if (exception instanceof QueryFailedError) {
      /* ---------------- TYPEORM: QUERY FAILED ---------------- */
      statusCode = HttpStatus.UNPROCESSABLE_ENTITY;

      const driverError = exception.driverError as PostgresError;

      if (env === 'development') {
        apiResponse = fail(
          exception.message,
          driverError.code ?? 'DATABASE_ERROR',
          {
            detail: driverError.detail,
            table: driverError.table,
            column: driverError.column,
            constraint: driverError.constraint,
            query: exception.query,
            parameters: exception.parameters,
          },
        );
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const mapped = handleTypeORMError(exception);
        apiResponse = fail(mapped.message, mapped.code!);
      }
    } else if (exception instanceof EntityNotFoundError) {
      /* ---------------- TYPEORM: ENTITY NOT FOUND ---------------- */
      statusCode = HttpStatus.NOT_FOUND;
      apiResponse = fail('Resource not found', 'ENTITY_NOT_FOUND');
    } else if (exception instanceof TypeORMError) {
      /* ---------------- TYPEORM: GENERIC ---------------- */
      statusCode = HttpStatus.BAD_REQUEST;
      apiResponse = fail(exception.message, 'TYPEORM_ERROR');
    } else if (exception instanceof Error) {
      /* ---------------- GENERIC ERROR ---------------- */
      apiResponse = fail(
        'Internal server error',
        'INTERNAL_SERVER_ERROR',
        env === 'development' ? { stack: exception.stack } : undefined,
      );
    } else {
      /* ---------------- UNKNOWN ---------------- */
      apiResponse = fail('Unexpected error', 'UNKNOWN_ERROR');
    }

    /* ---------------- STRUCTURED LOGGING ---------------- */
    this.logger.error(
      {
        event: 'exception',
        requestId: request.requestId,
        method: request.method,
        url: request.originalUrl,
        statusCode,
        errorCode: apiResponse.error?.code,
        exception,
      },
      AllExceptionsFilter.name,
    );

    response.status(statusCode).json(apiResponse);
  }
}
