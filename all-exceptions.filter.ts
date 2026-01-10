import {
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Inject,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError, TypeORMError } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LoggerService } from '@nestjs/common';
import { handleTypeORMError } from 'src/utils/typeorm.util';

type MyResponseObj = {
  statusCode: number;
  timestamp: string;
  path: string;
  response: string | object;
};

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

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const environment = this.configService.get<string>('NODE_ENV');
    console.log(request.requestId);

    const myResponseObj: MyResponseObj = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      response: 'Internal Server Error',
    };

    /* ---------------- HTTP EXCEPTIONS ---------------- */
    if (exception instanceof HttpException) {
      myResponseObj.statusCode = exception.getStatus();
      const errorResponse = exception.getResponse();

      myResponseObj.response =
        typeof errorResponse === 'string'
          ? { message: errorResponse }
          : errorResponse;
    } else if (exception instanceof QueryFailedError) {
      /* ---------------- TYPEORM: QUERY FAILED ---------------- */
      const driverError = exception.driverError as PostgresError;

      myResponseObj.statusCode = HttpStatus.UNPROCESSABLE_ENTITY;

      if (environment === 'development') {
        myResponseObj.response = {
          message: exception.message,
          code: driverError.code,
          detail: driverError.detail,
          query: exception.query,
          parameters: exception.parameters,
        };
      } else {
        const error = handleTypeORMError(exception as QueryFailedError<Error>);
        myResponseObj.response = {
          message: error.message,
          code: error.code,
        };
      }
    } else if (exception instanceof EntityNotFoundError) {
      /* ---------------- TYPEORM: ENTITY NOT FOUND ---------------- */
      myResponseObj.statusCode = HttpStatus.NOT_FOUND;
      myResponseObj.response = {
        message: exception.message,
      };
    } else if (exception instanceof TypeORMError) {
      /* ---------------- TYPEORM: GENERIC ---------------- */
      myResponseObj.statusCode = HttpStatus.BAD_REQUEST;
      myResponseObj.response = {
        message: exception.message,
      };
    } else if (exception instanceof Error) {
      /* ---------------- GENERIC ERROR ---------------- */
      myResponseObj.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      myResponseObj.response = {
        message: exception.message,
        ...(environment === 'development' && { stack: exception.stack }),
      };
    } else {
      /* ---------------- UNKNOWN ---------------- */
      myResponseObj.response = {
        message: 'An unexpected error occurred',
      };
    }

    /* ---------------- STRUCTURED LOGGING ---------------- */
    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : undefined,
      AllExceptionsFilter.name,
      {
        requestId: request.requestId,
        method: request.method,
        url: request.originalUrl,
        statusCode: myResponseObj.statusCode,
        response: myResponseObj.response,
      },
    );

    response.status(myResponseObj.statusCode).json(myResponseObj);
  }
}
