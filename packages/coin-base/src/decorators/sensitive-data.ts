/**
 * Decorator to clean sensitive data from error objects
 *
 * This decorator automatically removes sensitive information like mnemonics
 * and private keys from error objects before they are thrown or logged.
 */
export function cleanSensitiveData() {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const isStatic = typeof target === 'function';

    // Handle both async and sync methods
    descriptor.value = function (...args: unknown[]) {
      try {
        const result = originalMethod.apply(this, args);

        // If the result is a promise, handle async errors
        if (result && typeof result.then === 'function') {
          return result.catch((error: unknown) => {
            if (error instanceof Error) {
              cleanErrorObject(error);
            }
            throw error;
          });
        }

        return result;
      } catch (error) {
        // Handle sync errors
        if (error instanceof Error) {
          cleanErrorObject(error);
        }
        throw error;
      }
    };

    // For static methods, also update the method on the constructor
    if (isStatic && typeof target === 'function') {
      (target as any)[propertyKey] = descriptor.value;
    }

    return descriptor;
  };
}

/**
 * Recursively clean sensitive data from an error object
 */
function cleanErrorObject(error: Error): void {
  const sensitivePatterns = [/mnemonic/i, /private.*key/i, /secret/i, /password/i, /seed/i];

  // Clean error message
  // Replace 12 or 24 word sequences
  error.message = error.message.replace(/\b\w+(\s+\w+){11}\b/g, '[REDACTED]');
  error.message = error.message.replace(/\b\w+(\s+\w+){23}\b/g, '[REDACTED]');
  // Replace private keys
  error.message = error.message.replace(/\b0x[a-fA-F0-9]{64}\b/g, '[REDACTED]');

  // Clean error properties
  const errorAny = error as any;
  for (const key in errorAny) {
    if (errorAny.hasOwnProperty(key)) {
      for (const pattern of sensitivePatterns) {
        if (pattern.test(key)) {
          errorAny[key] = '[REDACTED]';
        } else if (typeof errorAny[key] === 'string') {
          // Check if the value looks like a mnemonic or private key
          // Check for 12 or 24 words (mnemonic)
          const wordCount = errorAny[key].trim().split(/\s+/).length;
          if ((wordCount === 12 || wordCount === 24) && /^\w+(\s+\w+){11,23}$/.test(errorAny[key].trim())) {
            errorAny[key] = '[REDACTED]';
          } else if (/\b0x[a-fA-F0-9]{64}\b/.test(errorAny[key])) {
            // Check for private key
            errorAny[key] = '[REDACTED]';
          }
        } else if (typeof errorAny[key] === 'object' && errorAny[key] !== null) {
          // Recursively clean nested objects
          if (errorAny[key] instanceof Error) {
            cleanErrorObject(errorAny[key]);
          } else {
            // Clean nested plain objects
            cleanNestedObject(errorAny[key]);
          }
        }
      }
    }
  }
}

/**
 * Clean sensitive data from nested plain objects
 */
function cleanNestedObject(obj: unknown): void {
  // Type guard to ensure obj is an object
  if (typeof obj !== 'object' || obj === null) {
    return;
  }

  const sensitivePatterns = [/mnemonic/i, /private.*key/i, /secret/i, /password/i, /seed/i];

  const objRecord = obj as Record<string, unknown>;

  for (const key in objRecord) {
    if (Object.prototype.hasOwnProperty.call(objRecord, key)) {
      for (const pattern of sensitivePatterns) {
        if (pattern.test(key)) {
          objRecord[key] = '[REDACTED]';
          break;
        }
      }

      const value = objRecord[key];
      if (typeof value === 'string') {
        // Check if the value looks like a mnemonic or private key
        const wordCount = value.trim().split(/\s+/).length;
        if ((wordCount === 12 || wordCount === 24) && /^\w+(\s+\w+){11,23}$/.test(value.trim())) {
          objRecord[key] = '[REDACTED]';
        } else if (/\b0x[a-fA-F0-9]{64}\b/.test(value)) {
          objRecord[key] = '[REDACTED]';
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively clean nested objects
        if (value instanceof Error) {
          cleanErrorObject(value);
        } else {
          cleanNestedObject(value);
        }
      }
    }
  }
}
