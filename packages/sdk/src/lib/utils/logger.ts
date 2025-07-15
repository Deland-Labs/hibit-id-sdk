/**
 * Secure logger utility - prevents sensitive information leakage
 */

import { HibitEnv } from '../types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableProduction: boolean;
  env?: HibitEnv;
}

class SecureLogger {
  private config: LogConfig;
  private sensitiveKeys = [
    'password',
    'mnemonic',
    'privateKey',
    'seed',
    'token',
    'signature',
    'private_key',
    'secret',
    'key',
    'auth',
    'bearer',
    'credentials',
    'amount',
    'balance',
    'address',
    'message',
    'payload',
    'txHash',
    'transaction',
    'utxo',
    'commitTxId',
    'revealTxId'
  ];

  constructor(config?: Partial<LogConfig>) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableProduction: false,
      env: 'prod',
      ...config
    };
  }

  private isProduction(): boolean {
    if (this.config.env) {
      return this.config.env === 'prod';
    }
    return process.env.NODE_ENV === 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction() && !this.config.enableProduction) {
      return false;
    }

    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.level);
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (
        this.sensitiveKeys.some((sensitive) =>
          key.toLowerCase().includes(sensitive.toLowerCase())
        )
      ) {
        sanitized[key] = this.isProduction() ? '[REDACTED]' : '[SENSITIVE]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (data) {
      const sanitizedData = this.sanitizeData(data);
      return `${prefix} ${message} ${JSON.stringify(sanitizedData)}`;
    }

    return `${prefix} ${message}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug') && this.config.enableConsole) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info') && this.config.enableConsole) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn') && this.config.enableConsole) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog('error') && this.config.enableConsole) {
      let errorData;
      if (error instanceof Error) {
        errorData = this.isProduction()
          ? { message: error.message }
          : { message: error.message, stack: error.stack };
      } else {
        errorData = this.sanitizeData(error);
      }
      console.error(this.formatMessage('error', message, errorData));
    }
  }

  // Public method for sanitizing error messages
  sanitizeErrorMessage(message: string): string {
    const sanitized = this.sanitizeData({ message });
    return sanitized.message || 'An error occurred';
  }
}

// Create default logger instance
export const logger = new SecureLogger({
  level: 'debug',
  enableConsole: true,
  enableProduction: false,
  env: 'prod' // Default to production-safe logging
});

// Factory function for environment-aware logger
export const createLogger = (env: HibitEnv): SecureLogger => {
  return new SecureLogger({
    level: env === 'prod' ? 'error' : 'debug',
    enableConsole: true,
    enableProduction: env === 'prod',
    env: env
  });
};

// Export class for custom configuration
export { SecureLogger };
