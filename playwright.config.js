// Cấu hình kiểm thử: chạy một máy chủ web tạm thời để mở các trang trong trình duyệt thật.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 20000,
  use: { baseURL: 'http://localhost:8080' },
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://localhost:8080/',
    reuseExistingServer: true,
    stdout: 'ignore',
  },
});
