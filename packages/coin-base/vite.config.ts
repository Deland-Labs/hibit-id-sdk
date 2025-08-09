import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import checker from 'vite-plugin-checker';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      tsconfigPath: './tsconfig.json'
    }),
    checker({
      typescript: true,
      enableBuild: true
    })
  ],
  resolve: {
    alias: {
      src: resolve(__dirname, 'src')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CoinBase',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'index.js';
        if (format === 'cjs') return 'index.umd.cjs';
        return `index.${format}.js`;
      }
    },
    rollupOptions: {
      external: ['bignumber.js', '@delandlabs/hibit-basic-types', '@delandlabs/crypto-lib'],
      output: {
        exports: 'named'
      }
    },
    target: 'esnext',
    minify: false,
    sourcemap: true
  }
});
