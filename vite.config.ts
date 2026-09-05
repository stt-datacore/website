import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const processEnv: Record<string, string> = {}

  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('REACT_APP_') || key.startsWith('VITE_')) {
      processEnv[`process.env.${key}`] = JSON.stringify(value)
    }
  }

  processEnv['process.env.NODE_ENV'] = JSON.stringify(mode)

  return {
    server: {
      open: false
    },
    plugins: [react()],
    base: '/',
    publicDir: 'static',
    define: processEnv,
    build: {
      assetsDir: 'chunks',
      outDir: 'build'
    }
  }
})
