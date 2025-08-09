import { ILogger, LoggerData } from '../utils/logger';

/**
 * Method decorator that adds logging functionality to async methods
 *
 * @param methodName - The name of the method for logging
 * @param contextExtractor - Optional function to extract context from method arguments
 * @param resultExtractor - Optional function to extract log data from the result
 */
export function withLogging<TArgs extends readonly unknown[], TResult>(
  methodName: string,
  contextExtractor?: (args: TArgs) => LoggerData,
  resultExtractor?: (result: TResult) => LoggerData
) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: { logger: ILogger }, ...args: unknown[]) {
      const className = target.constructor.name;
      const logContext = contextExtractor ? contextExtractor(args as unknown as TArgs) : {};

      this.logger.debug(`Starting ${methodName}`, {
        context: `${className}.${propertyKey}`,
        data: logContext
      });

      try {
        const result = await originalMethod.apply(this, args);

        const resultContext = resultExtractor ? resultExtractor(result as TResult) : { success: true };

        this.logger.info(`${methodName} successful`, {
          context: `${className}.${propertyKey}`,
          data: {
            ...logContext,
            ...resultContext
          }
        });

        return result;
      } catch (error) {
        try {
          this.logger.error(`${methodName} failed`, {
            error: error instanceof Error ? error : new Error(String(error)),
            context: `${className}.${propertyKey}`,
            data: logContext
          });
        } catch (logError) {
          // If logging fails, use a secure fallback that doesn't expose sensitive data
          // Only log the fact that logging failed, not the actual error details
          try {
            console.error(
              `[${new Date().toISOString()}] Logging system failure in ${className}.${propertyKey} - details suppressed for security`
            );
          } catch {
            // If even console.error fails, silently continue
            // This is the last resort - we cannot log anything safely
          }
        }
        throw error;
      }
    };

    return descriptor;
  };
}
