const { test, expect } = require('@playwright/test');
const { mockSupabase } = require('./helpers');

async function open(page, chatFn) {
  await mockSupabase(page, '/rest/v1/menu_items*');
  await mockSupabase(page, '/functions/v1/chat', chatFn || (() => ({ status: 200, body: { reply: 'Quán mở cửa 9:00 - 22:00 hằng ngày.' } })));
  await page.goto('/prompt2/');
  await page.click('.chat-toggle');
}

test('mở khung chat thì có lời chào, đóng bằng phím Escape', async ({ page }) => {
  await open(page);
  await expect(page.locator('.chat-panel')).toBeVisible();
  await expect(page.locator('.chat-bot').first()).toContainText('Chào bạn');
  await page.keyboard.press('Escape');
  await expect(page.locator('.chat-panel')).toBeHidden();
  await expect(page.locator('.chat-toggle')).toHaveAttribute('aria-expanded', 'false');
});

test('gửi câu hỏi thì hiện câu hỏi và câu trả lời', async ({ page }) => {
  let sent;
  await open(page, (request) => { sent = request.postDataJSON(); return { status: 200, body: { reply: 'Quán mở cửa 9:00 - 22:00 hằng ngày.' } }; });
  await page.fill('.chat-form input', 'Mấy giờ mở cửa?');
  await page.click('.chat-send');
  await expect(page.locator('.chat-user')).toHaveText('Mấy giờ mở cửa?');
  await expect(page.locator('.chat-bot').last()).toContainText('9:00 - 22:00');
  expect(sent).toEqual({ message: 'Mấy giờ mở cửa?' });
});

test('bấm câu hỏi gợi ý thì gửi luôn', async ({ page }) => {
  await open(page);
  await page.click('.chat-chip >> text=Giờ mở cửa?');
  await expect(page.locator('.chat-user')).toHaveText('Giờ mở cửa?');
  await expect(page.locator('.chat-bot').last()).toContainText('9:00');
});

test('không gửi câu hỏi trống', async ({ page }) => {
  let called = false;
  await open(page, () => { called = true; return { status: 200, body: { reply: 'x' } }; });
  await page.fill('.chat-form input', '   ');
  await page.click('.chat-send');
  await expect(page.locator('.chat-user')).toHaveCount(0);
  expect(called).toBe(false);
});

test('máy chủ lỗi thì báo xin lỗi và chỉ số điện thoại', async ({ page }) => {
  await open(page, () => ({ status: 500, body: {} }));
  await page.fill('.chat-form input', 'xin chào');
  await page.click('.chat-send');
  await expect(page.locator('.chat-bot').last()).toContainText('0986 187 111');
  await expect(page.locator('.chat-send')).toBeEnabled();
});
