const { test, expect } = require('@playwright/test');
const { mockSupabase } = require('./helpers');

const MENU = [
  { id: '1', name: 'Món thử A', description: 'Mô tả A', price: 45000, image_url: null, alt_text: null, sort: 1, available: true },
  { id: '2', name: 'Món thử B', description: null, price: 1250000, image_url: null, alt_text: null, sort: 2, available: true },
];

test('menu trang chủ đọc từ cơ sở dữ liệu và định dạng giá', async ({ page }) => {
  await mockSupabase(page, '/rest/v1/menu_items*', () => ({ status: 200, body: MENU }));
  await page.goto('/prompt2/');
  const cards = page.locator('.menu-grid .card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('Món thử A');
  await expect(cards.nth(0)).toContainText('45.000đ');
  await expect(cards.nth(1)).toContainText('1.250.000đ');
});

test('cơ sở dữ liệu lỗi thì vẫn giữ menu có sẵn trong trang', async ({ page }) => {
  await mockSupabase(page, '/rest/v1/menu_items*', () => ({ status: 500, body: {} }));
  await page.goto('/prompt2/');
  await expect(page.locator('.menu-grid .card')).toHaveCount(6);
});

test('form liên hệ báo lỗi khi bỏ trống và không gửi đi', async ({ page }) => {
  let sent = false;
  await page.route('https://formspree.io/**', (route) => { sent = true; return route.abort(); });
  await page.goto('/prompt2/');
  await page.click('#contact-form button[type="submit"]');
  await expect(page.locator('#cf-name-error')).toHaveText('Vui lòng nhập họ tên.');
  await expect(page.locator('#cf-email-error')).toHaveText('Vui lòng nhập email.');
  await expect(page.locator('#cf-phone-error')).toHaveText('Vui lòng nhập số điện thoại.');
  await expect(page.locator('#cf-message-error')).toHaveText('Lời nhắn cần ít nhất 10 ký tự.');
  expect(sent).toBe(false);
});

test('email sai định dạng bị báo lỗi', async ({ page }) => {
  await page.goto('/prompt2/');
  await page.fill('#cf-email', 'khong-phai-email');
  await page.locator('#cf-email').blur();
  await expect(page.locator('#cf-email-error')).toHaveText('Email chưa đúng định dạng.');
});

test('menu Login đổi thành Logout và hiện mục Quản lý khi đã đăng nhập', async ({ page }) => {
  await mockSupabase(page, '/rest/v1/menu_items*');
  await page.goto('/prompt2/');
  await expect(page.locator('#auth-link')).toHaveText('Login');
  await expect(page.locator('#manage-item')).toBeHidden();

  await page.evaluate(() => sessionStorage.setItem('booking-admin-session', JSON.stringify({ t: 'x', exp: Date.now() + 3600000 })));
  await page.reload();
  await expect(page.locator('#auth-link')).toHaveText('Logout');
  await expect(page.locator('#manage-item')).toBeVisible();

  await page.click('#auth-link');
  await expect(page.locator('#auth-link')).toHaveText('Login');
});
