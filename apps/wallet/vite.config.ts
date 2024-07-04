import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from "vite-plugin-svgr";
import { nodePolyfills } from 'vite-plugin-node-polyfills'
// import { analyzer } from "vite-bundle-analyzer";
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      src: resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react({ tsDecorators: true }),
    svgr(),
    nodePolyfills()
    // analyzer()
  ],
  server: {
    port: 5175,
  },
  preview: {
    port: 4175,
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // rollupOptions: {
    //   output: {
    //     manualChunks: {
    //       'vconsole': ['vconsole'],
    //       'crypto-js': ['crypto-js'],
    //       'web3modal': ['@web3modal/ethers5'],
    //       'mobx': ['mobx', 'mobx-react'],
    //       'react-bootstrap': ['react-bootstrap'],
    //       'solana': ['@solana/web3.js'],
    //       'idea-react': ['idea-react'],
    //       'react-i18next': ['react-i18next'],
    //     }
    //   }
    // }
  }
})
