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
 * Options for logging methods
 */
export interface LogOptions {
  /** Structured data to log */
  data?: LoggerData;
  /** Context override (uses logger's default context if not provided) */
  context?: string;
}

/**
 * Options for error logging
 */
export interface ErrorLogOptions extends LogOptions {
  /** Error object to log */
  error?: Error;
}

/**
 * Console logger configuration options
 */
export interface ConsoleLoggerConfig {
  /** Minimum log level to display */
  minLevel?: LogLevel;
  /** Default context for this logger */
  defaultContext?: string;
  /** Whether to use colors in the console output */
  useColors?: boolean;
  /** Whether to show timestamps */
  showTimestamp?: boolean;
  /** Custom timestamp format function */
  formatTimestamp?: () => string;
}

/**
 * Logger interface for wallet operations
 */
export interface ILogger {
  /**
   * Log debug information
   * @param message - The log message
   * @param options - Optional logging options
   */
  debug(message: string, options?: LogOptions): void;

  /**
   * Log informational messages
   * @param message - The log message
   * @param options - Optional logging options
   */
  info(message: string, options?: LogOptions): void;

  /**
   * Log warning messages
   * @param message - The log message
   * @param options - Optional logging options
   */
  warn(message: string, options?: LogOptions): void;

  /**
   * Log error messages
   * @param message - The log message
   * @param options - Optional error logging options
   */
  error(message: string, options?: ErrorLogOptions): void;

  /**
   * Create a child logger with additional context
   * @param context - Additional context to append to parent context
   */
  child(context: string): ILogger;
}

/**
 * Default console logger implementation
 */
export class ConsoleLogger implements ILogger {
  private readonly minLevel: LogLevel;
  private readonly defaultContext?: string;
  private readonly useColors: boolean;
  private readonly showTimestamp: boolean;
  private readonly formatTimestamp: () => string;

  // Constructor overloads for backward compatibility
  constructor(minLevel?: LogLevel, context?: string);
  constructor(config?: ConsoleLoggerConfig);
  constructor(minLevelOrConfig?: LogLevel | ConsoleLoggerConfig, context?: string) {
    // Support both old and new constructor signatures
    if (typeof minLevelOrConfig === 'number' || minLevelOrConfig === undefined) {
      // Old signature: constructor(minLevel?: LogLevel, context?: string)
      this.minLevel = minLevelOrConfig ?? LogLevel.INFO;
      this.defaultContext = context;
      this.useColors = true;
      this.showTimestamp = true;
      this.formatTimestamp = () => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      };
    } else {
      // New signature: constructor(config?: ConsoleLoggerConfig)
      this.minLevel = minLevelOrConfig.minLevel ?? LogLevel.INFO;
      this.defaultContext = minLevelOrConfig.defaultContext;
      this.useColors = minLevelOrConfig.useColors ?? true;
      this.showTimestamp = minLevelOrConfig.showTimestamp ?? true;
      this.formatTimestamp = minLevelOrConfig.formatTimestamp ?? (() => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
      });
    }
  }

  debug(message: string, options?: LogOptions): void {
    if (this.minLevel <= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, message, options);
    }
  }

  info(message: string, options?: LogOptions): void {
    if (this.minLevel <= LogLevel.INFO) {
      this.log(LogLevel.INFO, message, options);
    }
  }

  warn(message: string, options?: LogOptions): void {
    if (this.minLevel <= LogLevel.WARN) {
      this.log(LogLevel.WARN, message, options);
    }
  }

  error(message: string, options?: ErrorLogOptions): void {
    if (this.minLevel <= LogLevel.ERROR) {
      this.log(LogLevel.ERROR, message, options);
    }
  }

  child(context: string): ILogger {
    const childContext = this.defaultContext 
      ? `${this.defaultContext}:${context}` 
      : context;
    return new ConsoleLogger({
      minLevel: this.minLevel,
      defaultContext: childContext,
      useColors: this.useColors,
      showTimestamp: this.showTimestamp,
      formatTimestamp: this.formatTimestamp
    });
  }

  private log(level: LogLevel, message: string, options?: LogOptions | ErrorLogOptions): void {
    // Format timestamp if enabled
    const timestamp = this.showTimestamp ? this.formatTimestamp() : '';
    const timestampStr = timestamp ? `${timestamp} ` : '';

    // Format level with optional color codes
    let levelStr: string;
    if (this.useColors) {
      const levelColors = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m',  // Green
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.ERROR]: '\x1b[31m'  // Red
      };
      const resetColor = '\x1b[0m';
      const colorCode = levelColors[level];
      levelStr = `${colorCode}[${LogLevel[level]}]${resetColor}`;
    } else {
      levelStr = `[${LogLevel[level].padEnd(5)}]`;
    }

    // Use override context if provided, otherwise use default
    const context = options?.context || this.defaultContext;
    const contextStr = context 
      ? this.useColors 
        ? `\x1b[90m[${context}]\x1b[0m` 
        : `[${context}]`
      : '';

    // Better structured format with clear separators
    const separator = contextStr ? ' ▸ ' : ' ';
    const logMessage = `${timestampStr}${levelStr} ${contextStr}${separator}${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, options?.data);
        break;
      case LogLevel.INFO:
        console.info(logMessage, options?.data);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, options?.data);
        break;
      case LogLevel.ERROR: {
        const errorOptions = options as ErrorLogOptions | undefined;
        console.error(logMessage, options?.data, errorOptions?.error);
        break;
      }
    }
  }
}

/**
 * No-op logger implementation for production or testing
 */
export class NoOpLogger implements ILogger {
  debug(_message: string, _options?: LogOptions): void {}
  info(_message: string, _options?: LogOptions): void {}
  warn(_message: string, _options?: LogOptions): void {}
  error(_message: string, _options?: ErrorLogOptions): void {}
  /**
   * Create a child logger (returns same instance for no-op implementation)
   * @param _context - Context string (ignored in no-op implementation)
   * @returns This same NoOpLogger instance
   */
  child(_context: string): ILogger {
    return this;
  }
}