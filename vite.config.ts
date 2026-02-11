import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import Unocss from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'
import svgLoader from 'vite-svg-loader'
import AutoImport from 'unplugin-auto-import/vite'
import fs from 'node:fs'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  // Windows下路径处理：确保以/开头且不包含Windows路径
  let base = env.VITE_BASE_URL || '/'
  if (base.includes('Program Files') || base.includes('\\')) {
    base = '/'
  }

  // 读取 package.json 中的版本号
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))

  return {
    base: base,
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version)
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        // output: {
        //   manualChunks: {
        //     common: ['vue', 'vue-router', '@vueuse/core', 'pinia'],
        //     ui: ['naive-ui']
        //   }
        // }
        output: {
          advancedChunks: {
            groups: [
              {
                test: /node_modules\/(?:vue|vue-router|@vueuse\/core|pinia)/,
                name: 'common',
                priority: 1
              },
              {
                test: /node_modules\/(?:naive-ui)/,
                name: 'ui',
                priority: 2
              }
            ]
          }
        }
      }
    },
    envPrefix: ['VITE_'],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    plugins: [
      nodePolyfills({
        include: ['buffer'],
        globals: {
          Buffer: true
        }
      }),
      vue(),
      svgLoader(),
      Unocss(),
      AutoImport({
        imports: ['vue', '@vueuse/core', 'vue-router'],
        dts: 'src/auto-imports.d.ts',
        eslintrc: {
          enabled: true
        },
        vueTemplate: true
      }),
      Components({
        resolvers: [NaiveUiResolver()],
        dts: true
      })
    ],
    server: {
      host: '0.0.0.0',
      port: 5174,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      proxy: {
        '/transmission/rpc': {
          target: env.VITE_DOMAIN,
          changeOrigin: true
        }
      }
    }
  }
})
