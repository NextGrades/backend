import {
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError, TypeORMError } from 'typeorm';
import { MyLoggerService } from 'src/logger/logger.service';
import { ConfigService } from '@nestjs/config';
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
  private readonly logger = new MyLoggerService(AllExceptionsFilter.name);
  private readonly configService = new ConfigService();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const environment = this.configService.get<string>('NODE_ENV');

    const myResponseObj: MyResponseObj = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      response: 'Internal Server Error',
    };

    if (exception instanceof HttpException) {
      // Handle HTTP exceptions (e.g., class-validator errors)
      myResponseObj.statusCode = exception.getStatus();
      const errorResponse = exception.getResponse();

      myResponseObj.response =
        typeof errorResponse === 'string'
          ? { message: errorResponse }
          : errorResponse;
    } else if (exception instanceof QueryFailedError) {
      // Handle TypeORM query errors (PostgreSQL)
      const driverError = exception.driverError as PostgresError;

      if (environment === 'development') {
        myResponseObj.statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
        myResponseObj.response = {
          message: exception.message,
          code: driverError.code,
          detail: driverError.detail,
          query: exception.query,
          parameters: exception.parameters,
        };
      } else {
        const error = handleTypeORMError(exception as QueryFailedError<Error>);
        myResponseObj.statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
        myResponseObj.response = {
          message: error.message,
          code: error.code,
        };
      }
    } else if (exception instanceof EntityNotFoundError) {
      // Handle entity not found errors
      myResponseObj.statusCode = HttpStatus.NOT_FOUND;
      myResponseObj.response = {
        message: exception.message,
      };
    } else if (exception instanceof TypeORMError) {
      // Handle other TypeORM-specific errors
      myResponseObj.statusCode = HttpStatus.BAD_REQUEST;
      myResponseObj.response = {
        message: exception.message,
      };
    } else if (exception instanceof Error) {
      myResponseObj.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      myResponseObj.response = {
        message: exception.message,
        stack: environment === 'development' ? exception.stack : undefined,
      };
    } else {
      // Catch all other unexpected errors
      console.error('Unexpected exception:', exception);
      myResponseObj.response = {
        message: 'An unexpected error occurred',
      };
    }

    // Log the error for debugging
    this.logger.error(
      JSON.stringify({
        ...myResponseObj,
      }),
      AllExceptionsFilter.name,
    );

    // Send response
    response.status(myResponseObj.statusCode).json(myResponseObj);
  }
}
