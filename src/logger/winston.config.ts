import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const winstonConfig = {
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      level: isProduction ? 'info' : 'debug',
      format: isProduction
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.timestamp(),
            nestWinstonModuleUtilities.format.nestLike('NextGrades', {
              prettyPrint: true,
            }),
          ),
    }),

    // File logs only in production
    ...(isProduction
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
          }),
        ]
      : []),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'exception.log' }),
  ],
};
