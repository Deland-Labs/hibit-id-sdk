/**
 * Log levels enumeration
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Logger primitive types
 */
export type LoggerPrimitive = string | number | boolean | undefined | null;

/**
 * Logger value types (primitives, arrays, or nested objects)
 */
export type LoggerValue = LoggerPrimitive | LoggerPrimitive[] | { [key: string]: LoggerPrimitive | LoggerPrimitive[] };

/**
 * Type-safe logger data interface
 */
export interface LoggerData {
  [key: string]: LoggerValue;
}

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: LoggerData;
  error?: Error;
}

/**
 * Logger interface for wallet operations
 */
export interface ILogger {
  /**
   * Log debug information
   */
  debug(message: string, context?: string, data?: LoggerData): void;

  /**
   * Log informational messages
   */
  info(message: string, context?: string, data?: LoggerData): void;

  /**
   * Log warning messages
   */
  warn(message: string, context?: string, data?: LoggerData): void;

  /**
   * Log error messages
   */
  error(message: string, error?: Error, context?: string, data?: LoggerData): void;

  /**
   * Create a child logger with additional context
   */
  child(context: string): ILogger;
}

/**
 * Default console logger implementation
 */
export class ConsoleLogger implements ILogger {
  private readonly contextPrefix: string;

  constructor(
    private readonly minLevel: LogLevel = LogLevel.INFO,
    context?: string
  ) {
    this.contextPrefix = context ? `[${context}]` : '';
  }

  debug(message: string, context?: string, data?: LoggerData): void {
    if (this.minLevel <= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, message, context, data);
    }
  }

  info(message: string, context?: string, data?: LoggerData): void {
    if (this.minLevel <= LogLevel.INFO) {
      this.log(LogLevel.INFO, message, context, data);
    }
  }

  warn(message: string, context?: string, data?: LoggerData): void {
    if (this.minLevel <= LogLevel.WARN) {
      this.log(LogLevel.WARN, message, context, data);
    }
  }

  error(message: string, error?: Error, context?: string, data?: LoggerData): void {
    if (this.minLevel <= LogLevel.ERROR) {
      this.log(LogLevel.ERROR, message, context, data, error);
    }
  }

  child(context: string): ILogger {
    const childContext = this.contextPrefix ? `${this.contextPrefix.slice(1, -1)}:${context}` : context;
    return new ConsoleLogger(this.minLevel, childContext);
  }

  private log(level: LogLevel, message: string, context?: string, data?: LoggerData, error?: Error): void {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level].padEnd(5);
    const contextStr = context ? `[${context}]` : '';
    const fullPrefix = `${this.contextPrefix}${contextStr}`;

    const logMessage = `${timestamp} ${levelStr} ${fullPrefix} ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, data);
        break;
      case LogLevel.INFO:
        console.info(logMessage, data);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, data);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, data, error);
        break;
    }
  }
}

/**
 * No-op logger implementation for production or testing
 */
export class NoOpLogger implements ILogger {
  debug(_message: string, _context?: string, _data?: LoggerData): void {}
  info(_message: string, _context?: string, _data?: LoggerData): void {}
  warn(_message: string, _context?: string, _data?: LoggerData): void {}
  error(_message: string, _error?: Error, _context?: string, _data?: LoggerData): void {}
  /**
   * Create a child logger (returns same instance for no-op implementation)
   * @param _context - Context string (ignored in no-op implementation)
   * @returns This same NoOpLogger instance
   */
  child(_context: string): ILogger {
    return this;
  }
}
