import { defineConfig } from 'vite';
import { resolve } from 'path';
import typescript from '@rollup/plugin-typescript';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      'src': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CoinKaspaRpc',
      // the proper extensions will be added
      fileName: 'coin-kaspa-rpc'
    },
    rollupOptions: {
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