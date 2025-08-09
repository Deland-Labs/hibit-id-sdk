import 'reflect-metadata';
import { describe, expect, test, vi } from 'vitest';
import { ConsoleLogger, LogLevel, NoOpLogger } from '../src/utils/logger';

describe('Logger Classes', () => {
  describe('ConsoleLogger', () => {
    test('should be instantiable with different log levels', () => {
      const debugLogger = new ConsoleLogger(LogLevel.DEBUG);
      const infoLogger = new ConsoleLogger(LogLevel.INFO);
      const warnLogger = new ConsoleLogger(LogLevel.WARN);
      const errorLogger = new ConsoleLogger(LogLevel.ERROR);

      expect(debugLogger).toBeInstanceOf(ConsoleLogger);
      expect(infoLogger).toBeInstanceOf(ConsoleLogger);
      expect(warnLogger).toBeInstanceOf(ConsoleLogger);
      expect(errorLogger).toBeInstanceOf(ConsoleLogger);
    });

    test('should have all logging methods', () => {
      const logger = new ConsoleLogger(LogLevel.DEBUG);

      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.child).toBe('function');
    });

    test('should create child logger with context', () => {
      const parentLogger = new ConsoleLogger(LogLevel.INFO, 'Parent');
      const childLogger = parentLogger.child('Child');

      expect(childLogger).toBeInstanceOf(ConsoleLogger);
    });

    test('should log at appropriate levels', () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const logger = new ConsoleLogger(LogLevel.DEBUG, 'TestLogger');

      logger.debug('Debug message', { context: 'test.method' });
      logger.info('Info message', { context: 'test.method' });
      logger.warn('Warn message', { context: 'test.method' });
      logger.error('Error message', { error: new Error('Test error'), context: 'test.method' });

      expect(debugSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();

      debugSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    test('should respect log level filtering', () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const warnLogger = new ConsoleLogger(LogLevel.WARN, 'WarnLogger');

      warnLogger.debug('Debug message', { context: 'test.method' }); // Should not log
      warnLogger.info('Info message', { context: 'test.method' }); // Should not log
      warnLogger.warn('Warn message', { context: 'test.method' }); // Should log
      warnLogger.error('Error message', { error: new Error('Test'), context: 'test.method' }); // Should log

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();

      debugSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('NoOpLogger', () => {
    test('should not throw on any operation', () => {
      const noOpLogger = new NoOpLogger();

      expect(() => noOpLogger.debug('test')).not.toThrow();
      expect(() => noOpLogger.info('test')).not.toThrow();
      expect(() => noOpLogger.warn('test')).not.toThrow();
      expect(() => noOpLogger.error('test')).not.toThrow();
      expect(() => noOpLogger.child('test')).not.toThrow();
    });

    test('should return itself when creating child', () => {
      const noOpLogger = new NoOpLogger();
      const child = noOpLogger.child('test-context');

      expect(child).toBe(noOpLogger);
    });

    test('should not produce any console output', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const noOpLogger = new NoOpLogger();

      noOpLogger.debug('test');
      noOpLogger.info('test');
      noOpLogger.warn('test');
      noOpLogger.error('test');

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      debugSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
