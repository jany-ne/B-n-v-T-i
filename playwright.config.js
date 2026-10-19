// Cấu hình kiểm thử: chạy một máy chủ web tạm thời để mở các trang trong trình duyệt thật.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 20000,
  use: { baseURL: 'http://localhost:8080' },
  webServer: [
    // Trang HTML thường (prompt1, prompt2, prompt3)
    { command: 'python3 -m http.server 8080', url: 'http://localhost:8080/', reuseExistingServer: true, stdout: 'ignore' },
    // Bản React đã build (app/dist), chạy bằng vite preview để địa chỉ sạch như /dat-ban mở thẳng được. Cần build trước.
    { command: 'npm --prefix app run preview -- --port 8081 --strictPort', url: 'http://localhost:8081/', reuseExistingServer: true, stdout: 'ignore' },
  ],
});
