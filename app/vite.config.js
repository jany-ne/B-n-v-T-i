import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Khi chạy trên máy (npm run dev) trang nằm ở gốc "/". Khi đưa lên GitHub Pages, trang nằm trong thư mục
// con của tên repo, nên lúc build ta truyền VITE_BASE=/ban-va-toi/ (xem .github/workflows/test.yml).
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
});
