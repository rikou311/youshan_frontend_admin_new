import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { mockApiPlugin } from './build/mock-api'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMock = env.VITE_USE_MOCK !== 'false'

  return {
    plugins: [vue(), ...(useMock ? [mockApiPlugin()] : [])],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: useMock
        ? undefined
        : {
            '/jee-fk': {
              target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
              changeOrigin: true,
            },
          },
    },
  }
})
