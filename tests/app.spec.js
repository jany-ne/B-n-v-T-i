// Kiểm thử bản React (app/dist), chạy ở cổng 8081.
const { test, expect } = require('@playwright/test');
const { mockSupabase, mockTurnstile } = require('./helpers');

const APP = 'http://localhost:8081/';
const MENU = [
  { id: 'm1', name: 'Món thử A', description: 'Mô tả A', price: 45000, image_url: null, alt_text: null, sort: 1, available: true },
  { id: 'm2', name: 'Món thử B', description: null, price: 1250000, image_url: null, alt_text: null, sort: 2, available: true },
];

test.beforeEach(async ({ page }) => {
  await mockTurnstile(page);
  await page.route('https://www.google.com/maps/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '' }));
});

test('trang hiện đủ các phần và menu đọc từ cơ sở dữ liệu', async ({ page }) => {
  await mockSupabase(page, '/rest/v1/menu_items*', () => ({ status: 200, body: MENU }));
  await page.goto(APP);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Một tách cà phê, một ngày tươi mới');
  await expect(page.locator('#menu article')).toHaveCount(2);
  await expect(page.locator('#menu article').first()).toContainText('45.000đ');
  await expect(page.locator('#menu article').nth(1)).toContainText('1.250.000đ');
  await expect(page.getByRole('link', { name: 'Mua ngay Món thử A' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mua ngay Món thử B' })).toBeVisible();
  await expect(page.locator('#danh-gia figure')).toHaveCount(3);
  await expect(page.locator('#danh-gia [role="img"]').last()).toHaveAttribute('aria-label', '4 trên 5 sao');
  await expect(page.locator('#lien-he')).toContainText('Dương Bá Trạc');
});

test('cơ sở dữ liệu lỗi thì giữ menu dự phòng 6 món', async ({ page }) => {
  await mockSupabase(page, '/rest/v1/menu_items*', () => ({ status: 500, body: {} }));
  await page.goto(APP);
  await expect(page.locator('#menu article')).toHaveCount(6);
});

test('menu trên điện thoại mở và đóng được, Escape cũng đóng', async ({ page }) => {
  await mockSupabase(page, '/rest/v1/menu_items*');
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(APP);
  const toggle = page.getByRole('button', { name: 'Mở menu' });
  await expect(page.locator('#site-nav')).toBeHidden();
  await toggle.click();
  await expect(page.locator('#site-nav')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đóng menu' })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#site-nav')).toBeHidden();
});

async function fill(page) {
  await page.fill('#cf-name', 'Nguyễn Văn A');
  await page.fill('#cf-email', 'khach@example.com');
  await page.fill('#cf-phone', '0986 187 111');
  await page.fill('#cf-message', 'Quán có nhận đặt tiệc sinh nhật không?');
}

test('form liên hệ báo lỗi khi bỏ trống và không gửi đi', async ({ page }) => {
  let sent = false;
  await mockSupabase(page, '/rest/v1/menu_items*');
  await mockSupabase(page, '/functions/v1/contact', () => { sent = true; return { status: 200, body: {} }; });
  await page.goto(APP);
  await page.getByRole('button', { name: 'Gửi lời nhắn' }).click();
  await expect(page.getByText('Vui lòng nhập họ tên.')).toBeVisible();
  await expect(page.getByText('Vui lòng nhập email.')).toBeVisible();
  await expect(page.getByText('Vui lòng nhập số điện thoại.')).toBeVisible();
  await expect(page.getByText('Lời nhắn cần ít nhất 10 ký tự.')).toBeVisible();
  await expect(page.locator('#cf-name')).toBeFocused();
  await expect(page.locator('#cf-name')).toHaveAttribute('aria-invalid', 'true');
  expect(sent).toBe(false);
});

test('email sai định dạng bị báo lỗi, sửa đúng thì hết lỗi', async ({ page }) => {
  await mockSupabase(page, '/rest/v1/menu_items*');
  await page.goto(APP);
  await page.fill('#cf-email', 'khong-phai-email');
  await page.locator('#cf-email').blur();
  await expect(page.getByText('Email chưa đúng định dạng.')).toBeVisible();
  await page.fill('#cf-email', 'khach@example.com');
  await expect(page.getByText('Email chưa đúng định dạng.')).toBeHidden();
});

test('gửi thành công: gửi token và dữ liệu, xóa form, hiện lời cảm ơn', async ({ page }) => {
  let body;
  await mockSupabase(page, '/rest/v1/menu_items*');
  await mockSupabase(page, '/functions/v1/contact', (r) => { body = r.postDataJSON(); return { status: 200, body: { ok: true } }; });
  await page.goto(APP);
  await fill(page);
  await page.getByRole('button', { name: 'Gửi lời nhắn' }).click();
  await expect(page.getByRole('status')).toContainText('Cảm ơn bạn');
  expect(body.token).toBe('token-gia');
  expect(body.contact).toEqual({ name: 'Nguyễn Văn A', email: 'khach@example.com', phone: '0986 187 111', message: 'Quán có nhận đặt tiệc sinh nhật không?' });
  await expect(page.locator('#cf-name')).toHaveValue('');
});

test('chưa xác minh captcha thì không gửi và báo lỗi', async ({ page }) => {
  let called = false;
  await page.addInitScript(() => { window.turnstile = { render: () => 'w', reset: () => {}, remove: () => {} }; }); // không bao giờ cấp token
  await mockSupabase(page, '/rest/v1/menu_items*');
  await mockSupabase(page, '/functions/v1/contact', () => { called = true; return { status: 200, body: {} }; });
  await page.goto(APP);
  await fill(page);
  await page.getByRole('button', { name: 'Gửi lời nhắn' }).click();
  await expect(page.getByText('Vui lòng xác minh bạn không phải robot.')).toBeVisible();
  expect(called).toBe(false);
});

test('máy chủ báo captcha sai hoặc lỗi thì hiện đúng thông báo', async ({ page }) => {
  let status = 400;
  await mockSupabase(page, '/rest/v1/menu_items*');
  await mockSupabase(page, '/functions/v1/contact', () => (status === 400 ? { status, body: { error: 'captcha' } } : { status, body: {} }));
  await page.goto(APP);
  await fill(page);
  await page.getByRole('button', { name: 'Gửi lời nhắn' }).click();
  await expect(page.getByRole('status')).toContainText('Xác minh không hợp lệ');
  status = 502;
  await page.getByRole('button', { name: 'Gửi lời nhắn' }).click();
  await expect(page.getByRole('status')).toContainText('0986 187 111');
  await expect(page.getByRole('button', { name: 'Gửi lời nhắn' })).toBeEnabled();
});

// ---------- Chatbot ----------
async function openChat(page, chatFn) {
  await mockSupabase(page, '/rest/v1/menu_items*');
  await mockSupabase(page, '/functions/v1/chat', chatFn || (() => ({ status: 200, body: { reply: 'Quán mở cửa 9:00 - 22:00 hằng ngày.' } })));
  await page.goto(APP);
  await page.getByRole('button', { name: 'Hỏi quán' }).click();
}

test('chatbot: mở có lời chào, Escape đóng và trả con trỏ về nút mở', async ({ page }) => {
  await openChat(page);
  const panel = page.getByRole('region', { name: 'Trò chuyện với quán' });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Chào bạn');
  await expect(page.getByLabel('Câu hỏi của bạn')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', { name: 'Hỏi quán' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Hỏi quán' })).toHaveAttribute('aria-expanded', 'false');
});

test('chatbot: gửi câu hỏi thì hiện câu hỏi và câu trả lời, gửi đúng dữ liệu', async ({ page }) => {
  let sent;
  await openChat(page, (r) => { sent = r.postDataJSON(); return { status: 200, body: { reply: 'Quán mở cửa 9:00 - 22:00 hằng ngày.' } }; });
  await page.getByLabel('Câu hỏi của bạn').fill('Mấy giờ mở cửa?');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  const log = page.getByRole('log');
  await expect(log).toContainText('Mấy giờ mở cửa?');
  await expect(log).toContainText('9:00 - 22:00');
  await expect(log).not.toContainText('Đang trả lời');
  await expect(page.getByLabel('Câu hỏi của bạn')).toHaveValue('');
  expect(sent).toEqual({ message: 'Mấy giờ mở cửa?' });
});

test('chatbot: bấm câu hỏi gợi ý thì gửi luôn', async ({ page }) => {
  await openChat(page);
  await page.getByRole('button', { name: 'Giờ mở cửa?' }).click();
  await expect(page.getByRole('log')).toContainText('9:00');
});

test('chatbot: không gửi câu hỏi trống', async ({ page }) => {
  let called = false;
  await openChat(page, () => { called = true; return { status: 200, body: { reply: 'x' } }; });
  await page.getByLabel('Câu hỏi của bạn').fill('   ');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  expect(called).toBe(false);
  await expect(page.getByRole('log').locator('div')).toHaveCount(1); // chỉ có lời chào
});

test('chatbot: máy chủ lỗi thì xin lỗi, chỉ số điện thoại và cho gửi tiếp', async ({ page }) => {
  await openChat(page, () => ({ status: 500, body: {} }));
  await page.getByLabel('Câu hỏi của bạn').fill('xin chào');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('0986 187 111');
  await expect(page.getByRole('button', { name: 'Gửi', exact: true })).toBeEnabled();
});

// ---------- Chân trang và menu ----------
test('chân trang có liên kết nhanh, gọi điện, Zalo, Facebook', async ({ page }) => {
  await mockSupabase(page, '/rest/v1/menu_items*');
  await page.goto(APP);
  const footer = page.getByRole('contentinfo');
  await expect(footer).toContainText('Dương Bá Trạc');
  await expect(footer).toContainText('© 2026 Bạn & Tôi');

  const quick = footer.getByRole('navigation', { name: 'Liên kết nhanh' });
  await expect(quick.getByRole('link')).toHaveText(['Trang chủ', 'Menu', 'Đặt bàn', 'Đánh giá', 'Liên hệ']);
  await expect(quick.getByRole('link', { name: 'Menu' })).toHaveAttribute('href', '/');
  await expect(quick.getByRole('link', { name: 'Đặt bàn' })).toHaveAttribute('href', '/dat-ban');

  await expect(footer.getByRole('link', { name: /Gọi 0986 187 111/ })).toHaveAttribute('href', 'tel:0986187111');
  const zalo = footer.getByRole('link', { name: /Zalo/ });
  await expect(zalo).toHaveAttribute('href', 'https://zalo.me/0986187186');
  await expect(zalo).toHaveAttribute('target', '_blank');
  await expect(zalo).toHaveAttribute('rel', /noopener/);
  await expect(footer.getByRole('link', { name: /Facebook/ })).toHaveAttribute('href', /facebook\.com/);
});

test('menu trên cùng có mục Đặt bàn theo đúng thứ tự', async ({ page }) => {
  await mockSupabase(page, '/rest/v1/menu_items*');
  await page.goto(APP);
  await expect(page.locator('#site-nav a')).toHaveText(['Trang chủ', 'Menu', 'Đặt bàn', 'Đánh giá', 'Liên hệ', 'Login']);
});
