import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // เพิ่มเป็น 1000KB หรือตามต้องการ
  },
})