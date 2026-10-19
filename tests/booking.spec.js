const { test, expect } = require('@playwright/test');
const { mockSupabase, mockTurnstile, futureDate, TABLES } = require('./helpers');

// Mở trang đặt bàn với dữ liệu giả: B1 đã có người đặt vào khung giờ được chọn.
async function openBooking(page, bookFn) {
  await mockTurnstile(page);
  await mockSupabase(page, '/rest/v1/restaurant_tables*', () => ({ status: 200, body: TABLES }));
  await mockSupabase(page, '/rest/v1/rpc/get_taken_tables', () => ({ status: 200, body: [{ table_id: 'B1' }] }));
  await mockSupabase(page, '/functions/v1/book', bookFn || (() => ({ status: 200, body: { ok: true } })));
  await page.goto('/prompt3/');
  await expect(page.locator('#bk-tables .table-option')).toHaveCount(3);
}

async function fillValid(page) {
  await page.fill('#bk-name', 'Nguyễn Văn A');
  await page.fill('#bk-phone', '0986 187 111');
  await page.fill('#bk-date', futureDate());
  await page.selectOption('#bk-time', '19:00');
}

test('gửi form trống thì hiện lỗi và không gọi máy chủ', async ({ page }) => {
  let called = false;
  await openBooking(page, () => { called = true; return { status: 200, body: {} }; });
  await page.click('button[type="submit"]');
  await expect(page.locator('#bk-name-error')).toHaveText('Vui lòng nhập họ tên.');
  await expect(page.locator('#bk-phone-error')).toHaveText('Vui lòng nhập số điện thoại.');
  await expect(page.locator('#bk-date-error')).toHaveText('Vui lòng chọn ngày.');
  await expect(page.locator('#bk-time-error')).toHaveText('Vui lòng chọn giờ.');
  expect(called).toBe(false);
});

test('số điện thoại sai định dạng bị báo lỗi', async ({ page }) => {
  await openBooking(page);
  await page.fill('#bk-phone', '12345');
  await page.locator('#bk-phone').blur();
  await expect(page.locator('#bk-phone-error')).toContainText('chưa đúng');
});

test('bàn đã có người đặt bị khóa, bàn không đủ chỗ cũng bị khóa', async ({ page }) => {
  await openBooking(page);
  await fillValid(page);
  const b1 = page.locator('#bk-tables .table-option', { hasText: 'Bàn 1' });
  await expect(b1).toContainText('Đã có người đặt');
  await expect(b1.locator('input')).toBeDisabled();
  await expect(page.locator('#bk-tables .table-option', { hasText: 'Bàn 2' }).locator('input')).toBeEnabled();

  await page.fill('#bk-guests', '4');
  const b2 = page.locator('#bk-tables .table-option', { hasText: 'Bàn 2' });
  await expect(b2).toContainText('Không đủ chỗ');
  await expect(page.locator('#bk-tables .table-option', { hasText: 'Bàn 5' }).locator('input')).toBeEnabled();
});

test('đặt bàn thành công hiện lời cảm ơn và gửi đúng dữ liệu', async ({ page }) => {
  let sent;
  await openBooking(page, (request) => { sent = request.postDataJSON(); return { status: 200, body: { ok: true } }; });
  await fillValid(page);
  await page.locator('#bk-tables .table-option', { hasText: 'Bàn 2' }).click();
  await page.click('button[type="submit"]');
  await expect(page.locator('#bk-status')).toContainText('Cảm ơn bạn');
  expect(sent.token).toBe('token-gia');
  expect(sent.booking).toMatchObject({ name: 'Nguyễn Văn A', phone: '0986187111', booking_time: '19:00', table_id: 'B2', guests: 2 });
});

test('không chọn bàn thì không gửi được', async ({ page }) => {
  await openBooking(page);
  await fillValid(page);
  await page.click('button[type="submit"]');
  await expect(page.locator('#bk-table-error')).toHaveText('Vui lòng chọn bàn.');
});

test('bàn vừa bị người khác đặt (409) thì báo chọn bàn khác', async ({ page }) => {
  await openBooking(page, () => ({ status: 409, body: { error: 'conflict' } }));
  await fillValid(page);
  await page.locator('#bk-tables .table-option', { hasText: 'Bàn 2' }).click();
  await page.click('button[type="submit"]');
  await expect(page.locator('#bk-status')).toContainText('vừa được người khác đặt');
});
