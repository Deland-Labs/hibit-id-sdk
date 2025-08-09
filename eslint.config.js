/**
 * ESLint configuration - converted from TypeScript for compatibility
 */

import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';

// Import the rule manually since TypeScript imports are problematic
import sensitiveLoggingProtection from './eslint-rules/sensitive-logging-protection.js';

const localPlugin = {
  rules: {
    'sensitive-logging-protection': sensitiveLoggingProtection
  }
};

const config = [
  js.configs.recommended,
  {
    files: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
        // Remove project reference to avoid TypeScript project issues
        // project: './tsconfig.json',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        alert: 'readonly',
        sessionStorage: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLIFrameElement: 'readonly',
        MouseEvent: 'readonly',
        TouchEvent: 'readonly',
        TextEncoder: 'readonly',
        // Node.js globals
        Buffer: 'readonly',
        process: 'readonly',
        NodeJS: 'readonly',
        // Timer functions
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      local: localPlugin
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // Handle TypeScript 'this' parameters properly
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      // Custom rule: Detect sensitive methods missing @cleanSensitiveData decorator
      'local/sensitive-logging-protection': 'error'
    }
  }
];

export default config;
