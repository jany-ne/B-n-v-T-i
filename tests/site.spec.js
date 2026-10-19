const { test, expect } = require('@playwright/test');
const { mockSupabase, mockTurnstile } = require('./helpers');

// Trang chủ có Turnstile: dùng bản giả để test không phụ thuộc Cloudflare.
test.beforeEach(async ({ page }) => { await mockTurnstile(page); });

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
  await mockSupabase(page, '/functions/v1/contact', () => { sent = true; return { status: 200, body: {} }; });
  await page.goto('/prompt2/');
  await page.click('#contact-form button[type="submit"]');
  await expect(page.locator('#cf-name-error')).toHaveText('Vui lòng nhập họ tên.');
  await expect(page.locator('#cf-email-error')).toHaveText('Vui lòng nhập email.');
  await expect(page.locator('#cf-phone-error')).toHaveText('Vui lòng nhập số điện thoại.');
  await expect(page.locator('#cf-message-error')).toHaveText('Lời nhắn cần ít nhất 10 ký tự.');
  expect(sent).toBe(false);
});

async function fillContact(page) {
  await page.fill('#cf-name', 'Nguyễn Văn A');
  await page.fill('#cf-email', 'khach@example.com');
  await page.fill('#cf-phone', '0986 187 111');
  await page.fill('#cf-message', 'Quán có nhận đặt tiệc sinh nhật không?');
}

test('gửi liên hệ thành công: gửi token và dữ liệu tới hàm contact, không dùng Formspree', async ({ page }) => {
  let body;
  let formspree = false;
  await page.route('https://formspree.io/**', (route) => { formspree = true; return route.abort(); });
  await mockSupabase(page, '/functions/v1/contact', (r) => { body = r.postDataJSON(); return { status: 200, body: { ok: true } }; });
  await page.goto('/prompt2/');
  await fillContact(page);
  await page.click('#contact-form button[type="submit"]');
  await expect(page.locator('#cf-status')).toContainText('Cảm ơn bạn');
  expect(body.token).toBe('token-gia');
  expect(body.contact).toEqual({ name: 'Nguyễn Văn A', email: 'khach@example.com', phone: '0986 187 111', message: 'Quán có nhận đặt tiệc sinh nhật không?' });
  await expect(page.locator('#cf-name')).toHaveValue('');
  expect(formspree).toBe(false);
});

test('chưa xác minh captcha thì không gửi và báo lỗi', async ({ page }) => {
  let called = false;
  await page.addInitScript(() => { window.turnstile = { render: () => 'w', reset: () => {} }; }); // không bao giờ cấp token
  await mockSupabase(page, '/functions/v1/contact', () => { called = true; return { status: 200, body: {} }; });
  await page.goto('/prompt2/');
  await fillContact(page);
  await page.click('#contact-form button[type="submit"]');
  await expect(page.locator('#cf-captcha-error')).toHaveText('Vui lòng xác minh bạn không phải robot.');
  expect(called).toBe(false);
});

test('máy chủ báo captcha sai thì hiện thông báo xác minh', async ({ page }) => {
  await mockSupabase(page, '/functions/v1/contact', () => ({ status: 400, body: { error: 'captcha' } }));
  await page.goto('/prompt2/');
  await fillContact(page);
  await page.click('#contact-form button[type="submit"]');
  await expect(page.locator('#cf-status')).toContainText('Xác minh không hợp lệ');
});

test('máy chủ lỗi thì báo gửi không thành công và chỉ số điện thoại', async ({ page }) => {
  await mockSupabase(page, '/functions/v1/contact', () => ({ status: 502, body: { error: 'send' } }));
  await page.goto('/prompt2/');
  await fillContact(page);
  await page.click('#contact-form button[type="submit"]');
  await expect(page.locator('#cf-status')).toContainText('0986 187 111');
  await expect(page.locator('#contact-form button[type="submit"]')).toBeEnabled();
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
