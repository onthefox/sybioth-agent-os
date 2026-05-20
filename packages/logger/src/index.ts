/**
 * @module @sybioth/logger
 * Structured logger for the Sybioth stack.
 * Wraps pino with Sybioth-specific context.
 */

import pino from 'pino';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerOptions {
  level?: LogLevel;
  name?: string;
  pretty?: boolean;
  context?: Record<string, unknown>;
}

const DEFAULT_OPTIONS: LoggerOptions = {
  level: 'info',
  name: 'sybioth',
  pretty: process.env.NODE_ENV !== 'production',
};

export function createLogger(options: LoggerOptions = {}): pino.Logger {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const pinoOptions: pino.LoggerOptions = {
    level: opts.level,
    name: opts.name,
  };

  if (opts.pretty) {
    return pino({
      ...pinoOptions,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
    });
  }

  return pino(pinoOptions);
}

/** Create a child logger with additional context */
export function withContext(logger: pino.Logger, context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}

/** Create a logger for a specific component */
export function componentLogger(component: string, options: LoggerOptions = {}): pino.Logger {
  return createLogger({ ...options, name: `sybioth:${component}` });
}

// Default logger instance
let defaultLogger: pino.Logger | null = null;

export function getLogger(): pino.Logger {
  if (!defaultLogger) {
    defaultLogger = createLogger();
  }
  return defaultLogger;
}

export function setLogger(logger: pino.Logger): void {
  defaultLogger = logger;
}
