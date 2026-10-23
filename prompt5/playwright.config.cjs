// Cấu hình test riêng cho bài prompt5 (chỉ chạy trên máy, thư mục này không được đưa lên Git).
// Chạy từ thư mục gốc của repo:  npm --prefix prompt5 run build && npx playwright test -c prompt5/playwright.config.cjs
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 20000,
  webServer: {
    command: 'npm run preview -- --port 8083 --strictPort',
    url: 'http://localhost:8083/',
    reuseExistingServer: true,
    stdout: 'ignore',
  },
});
