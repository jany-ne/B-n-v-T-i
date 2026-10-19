import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' để khi triển khai lên GitHub Pages (trong thư mục con) đường dẫn ảnh, file vẫn đúng.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
