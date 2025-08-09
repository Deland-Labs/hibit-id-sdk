import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import checker from 'vite-plugin-checker';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    nodePolyfills(),
    dts({
      insertTypesEntry: true,
      rollupTypes: false, // 不合并类型文件，避免卡住
      tsconfigPath: './tsconfig.json',
      skipDiagnostics: true, // 已经有 checker 插件做类型检查
      logLevel: 'error' // 减少输出噪音
    }),
    checker({
      typescript: true,
      enableBuild: true
    })
  ],
  server: {
    host: '127.0.0.1',
    port: 6173
  },
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'HibitIDSdk',
      // the proper extensions will be added
      fileName: 'hibit-id-sdk'
    },
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/, /crypto-lib/]
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [
        'react',
        'react-dom',
        '@delandlabs/coin-base',
        '@delandlabs/coin-ton'
      ]
    },
    sourcemap: true
  }
});
