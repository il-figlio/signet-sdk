import pino from 'pino';

/**
 * Logger configuration based on environment variables:
 * - LOG_LEVEL: trace, debug, info, warn, error (default: info)
 * - LOG_FORMAT: json or pretty (default: pretty)
 */

const logLevel = (process.env.LOG_LEVEL || 'info') as pino.LevelWithSilent;
const logFormat = process.env.LOG_FORMAT || 'pretty';

const isJsonFormat = logFormat === 'json';

export const logger = pino({
  level: logLevel,
  transport: isJsonFormat
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
  formatters: isJsonFormat
    ? {
        level: (label) => {
          return { level: label };
        },
      }
    : undefined,
});

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
