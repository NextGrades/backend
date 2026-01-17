import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import { format } from 'winston';
import type { TransformableInfo } from 'logform';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Filter noisy Nest internals
 */
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

  if (typeof info.context === 'string' && blockedContexts.has(info.context)) {
    return false;
  }

  return info;
});

/**
 * File format (dev only)
 */
const fileFormat = winston.format.combine(
  ignoreNestInternals(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Console transport (always enabled)
 */
const consoleTransport = new winston.transports.Console({
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
});

/**
 * File transports — DEV ONLY
 */
const devFileTransports = isProduction
  ? []
  : [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: fileFormat,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: fileFormat,
      }),
    ];

export const winstonConfig = {
  transports: [consoleTransport, ...devFileTransports],

  /**
   * Exceptions:
   * - Console always
   * - File only in dev
   */
  exceptionHandlers: [
    new winston.transports.Console(),
    ...(!isProduction
      ? [
          new winston.transports.File({
            filename: 'logs/exception.log',
            format: fileFormat,
          }),
        ]
      : []),
  ],
};
