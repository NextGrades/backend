import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import { format } from 'winston';
import type { TransformableInfo } from 'logform';

const isProduction = process.env.NODE_ENV === 'production';

const ignoreNestInternals = format((info: TransformableInfo) => {
  const blockedContexts = new Set([
    'RoutesResolver',
    'RouterExplorer',
    'NestApplication',
    'NestFactory',
    'InstanceLoader',
    'TypeOrmCoreModule',
    'TypeOrmModule',
  ]);

  const context = info.context;

  if (typeof context === 'string' && blockedContexts.has(context)) {
    return false;
  }

  return info;
});

// Shared format for file transports
const fileFormat = winston.format.combine(
  ignoreNestInternals(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const winstonConfig = {
  transports: [
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

    ...(isProduction
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: fileFormat,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: fileFormat,
          }),
        ]
      : [
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: fileFormat,
          }),
        ]),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exception.log',
      format: fileFormat,
    }),
  ],
};
