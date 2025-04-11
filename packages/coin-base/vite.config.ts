import { defineConfig } from 'vite';
import { resolve } from 'path';
import typescript from '@rollup/plugin-typescript';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      src: resolve(__dirname, 'src')
    }
  },
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: {
        'index': resolve(__dirname, 'src/index.ts'),
        'model': resolve(__dirname, 'src/model.ts')
      },
      name: 'CoinBase',
      // the proper extensions will be added
      fileName: (mod, entry) => {
        return mod === 'cjs' ? `${entry}.umd.cjs` : `${entry}.js`
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/, /crypto-lib/]
    },
    rollupOptions: {
      external: ['bignumber.js'],
      output: {
        preserveModules: true
      },
      plugins: [
        typescript({
          target: 'es2020',
          rootDir: resolve(__dirname, 'src'),
          declaration: true,
          declarationDir: resolve(__dirname, 'dist'),
          exclude: [resolve(__dirname, 'node_modules/**'), resolve(__dirname, 'test/**')],
          allowSyntheticDefaultImports: true
        })
      ]
    }
  }
});
