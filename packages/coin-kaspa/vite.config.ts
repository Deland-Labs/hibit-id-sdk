import { defineConfig } from 'vite';
import { resolve } from 'path';
import typescript from '@rollup/plugin-typescript';
import { sharedPlugins } from '../../vite.shared.config';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: sharedPlugins,
  resolve: {
    alias: {
      src: resolve(__dirname, 'src')
    }
  },
  build: {
    sourcemap: true, // Enable source maps
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CoinKaspa',
      // the proper extensions will be added
      fileName: 'index'
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/crypto-lib/, /node_modules/]
    },
    rollupOptions: {
      external: ['@delandlabs/coin-base', 'bignumber.js'],
      plugins: [
        typescript({
          target: 'es2020',
          rootDir: resolve(__dirname, 'src'),
          declaration: true,
          declarationDir: resolve(__dirname, 'dist'),
          exclude: [resolve(__dirname, 'node_modules/**'), resolve(__dirname, 'test/**')],
          allowSyntheticDefaultImports: true,
          outputToFilesystem: true
        })
      ]
    }
  }
});
