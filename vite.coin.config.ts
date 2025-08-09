import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import checker from 'vite-plugin-checker';

/**
 * Create a standard vite config for coin packages
 */
export function createCoinConfig(options: {
  name: string;
  packageDir: string;
  external?: string[];
}) {
  const { name, packageDir, external = [] } = options;

  return defineConfig({
    plugins: [
      nodePolyfills(),
      dts({
        insertTypesEntry: true,
        rollupTypes: true,
        tsconfigPath: resolve(packageDir, 'tsconfig.json')
      }),
      checker({
        typescript: {
          tsconfigPath: resolve(packageDir, 'tsconfig.json'),
          buildMode: true
        },
        enableBuild: true
      })
    ],
    resolve: {
      alias: {
        src: resolve(packageDir, 'src')
      }
    },
    build: {
      lib: {
        entry: resolve(packageDir, 'src/index.ts'),
        name,
        formats: ['es', 'cjs'],
        fileName: (format) => {
          if (format === 'es') return 'index.js';
          if (format === 'cjs') return 'index.umd.cjs';
          return `index.${format}.js`;
        }
      },
      rollupOptions: {
        external: ['@delandlabs/coin-base', '@delandlabs/hibit-basic-types', 'bignumber.js', ...external],
        output: {
          exports: 'named'
        }
      },
      target: 'esnext',
      minify: false,
      sourcemap: true,
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [/node_modules/, /crypto-lib/]
      }
    }
  });
}