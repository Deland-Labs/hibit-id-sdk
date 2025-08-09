/**
 * ESLint rule: Detect sensitive methods missing @cleanSensitiveData decorator
 *
 * Rule logic:
 * 1. Detect method parameters containing sensitive words (mnemonic, privateKey, secretKey, seed, etc.)
 * 2. Detect method using @withLogging decorator
 * 3. Detect method missing @cleanSensitiveData decorator
 * 4. If first two conditions are met but third is missing, report error
 */

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Methods with sensitive parameters and @withLogging must also have @cleanSensitiveData decorator',
      category: 'Security',
      recommended: true
    },
    fixable: 'code',
    schema: [],
    messages: {
      missingSensitiveDataCleaning:
        'Method "{{methodName}}" has sensitive parameter "{{paramName}}" and @withLogging decorator, but lacks @cleanSensitiveData decorator for security protection.'
    }
  },

  create(context) {
    // Sensitive parameter name patterns
    const sensitivePatterns = [
      /^mnemonic$/i,
      /^privatekey$/i,
      /^private.*key$/i,
      /^secretkey$/i,
      /^secret.*key$/i,
      /^seed$/i,
      /.*mnemonic.*/i,
      /.*privatekey.*/i,
      /.*secretkey.*/i
    ];

    // Check if parameter name is sensitive
    function isSensitiveParameter(paramName) {
      return sensitivePatterns.some((pattern) => pattern.test(paramName));
    }

    // Check decorators
    function hasDecorator(decorators, decoratorName) {
      if (!decorators) return false;
      return decorators.some((decorator) => {
        if (decorator.expression.type === 'CallExpression') {
          return decorator.expression.callee.name === decoratorName;
        }
        return decorator.expression.name === decoratorName;
      });
    }

    // Get method decorators
    function getDecorators(node) {
      return node.decorators || [];
    }

    return {
      // Detect method definitions
      MethodDefinition(node) {
        const methodName = node.key.name;
        const decorators = getDecorators(node);

        // Check for sensitive parameters
        const sensitiveParams = node.value.params.filter((param) => {
          if (param.type === 'Identifier') {
            return isSensitiveParameter(param.name);
          }
          return false;
        });

        if (sensitiveParams.length === 0) {
          return; // No sensitive parameters, skip
        }

        // Check for @withLogging decorator
        const hasWithLogging = hasDecorator(decorators, 'withLogging');
        if (!hasWithLogging) {
          return; // No @withLogging, skip
        }

        // Check for @cleanSensitiveData decorator
        const hasCleanSensitiveData = hasDecorator(decorators, 'cleanSensitiveData');
        if (hasCleanSensitiveData) {
          return; // Already has protection decorator, pass check
        }

        // Report error
        sensitiveParams.forEach((param) => {
          if (param.type === 'Identifier') {
            context.report({
              node: node.key,
              messageId: 'missingSensitiveDataCleaning',
              data: {
                methodName: methodName,
                paramName: param.name
              },
              fix(fixer) {
                // Auto-fix: Add @cleanSensitiveData() to decorators list

                // Find position of last decorator
                if (decorators.length > 0) {
                  const lastDecorator = decorators[decorators.length - 1];

                  // Add @cleanSensitiveData() after last decorator
                  return fixer.insertTextAfter(lastDecorator, '\n  @cleanSensitiveData()');
                } else {
                  // If no other decorators, add before method
                  return fixer.insertTextBefore(node, '  @cleanSensitiveData()\n  ');
                }
              }
            });
          }
        });
      },

      // Detect function declarations
      FunctionDeclaration(node) {
        // Similar logic for function declarations
        // Can be extended as needed
      }
    };
  }
};

export default rule;
