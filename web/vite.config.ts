import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 后端通过 //go:embed internal/web/ui/* 嵌入前端，并在 /static/{file} 提供资源、/ 提供 index.html。
// 因此构建产物输出为扁平的 app.js / app.css / index.html，且引用前缀为 /static/。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/static/' : '/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: path.resolve(__dirname, '../internal/web/ui'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'app-[name].js',
        assetFileNames: (info) =>
          info.name && info.name.endsWith('.css') ? 'app.css' : 'assets/[name][extname]',
      },
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:9876', changeOrigin: true },
      '/rpc': { target: 'http://localhost:9876', changeOrigin: true },
    },
  },
}))
