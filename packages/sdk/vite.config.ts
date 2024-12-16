import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { resolve } from 'path'
import typescript from '@rollup/plugin-typescript'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    nodePolyfills()
  ],
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'HibitIDSdk',
      // the proper extensions will be added
      fileName: 'hibit-id-wallet-sdk',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      // external: ['react', 'react-dom'],
      // output: {
      //   // Provide global variables to use in the UMD build
      //   // for externalized deps
      //   globals: {
      //     react: 'React',
      //     'react-dom': 'ReactDOM',
      //   },
      // },
      plugins: [
        typescript({
          'target': 'es2020',
          'rootDir': resolve(__dirname, 'src'),
          'declaration': true,
          'declarationDir': resolve(__dirname, 'dist'),
          exclude: [
            resolve(__dirname, 'node_modules/**'),
            resolve(__dirname, 'src/test/**')
          ],
          allowSyntheticDefaultImports: true
        })
      ]
    },
  },
})
