import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import checker from 'vite-plugin-checker';
import typescript from '@rollup/plugin-typescript';
import { resolve } from 'path';

/**
 * Shared Vite configuration for all packages that need Node.js polyfills
 */
export const sharedPlugins = [
  nodePolyfills(),
  checker({
    typescript: true
  })
];

/**
 * Create TypeScript plugin configuration for consistent type generation
 * @param packageDir The directory of the package (usually __dirname)
 */
export const createTypeScriptPlugin = (packageDir: string) => {
  return typescript({
    target: 'es2020',
    rootDir: resolve(packageDir, 'src'),
    declaration: true,
    declarationDir: resolve(packageDir, 'dist'),
    exclude: [resolve(packageDir, 'node_modules/**'), resolve(packageDir, 'test/**'), resolve(packageDir, 'tests/**')],
    allowSyntheticDefaultImports: true
  });
};

/**
 * Base configuration for library packages
 */
export const baseLibConfig = defineConfig({
  plugins: sharedPlugins,
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/, /crypto-lib/]
    }
  }
});

export { nodePolyfills, checker };
