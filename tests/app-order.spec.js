// Kiểm thử nút Mua ngay và trang Đặt món của bản React (app/dist, cổng 8081).
const { test, expect } = require('@playwright/test');
const { mockSupabase, mockTurnstile } = require('./helpers');

const APP = 'http://localhost:8081/';
const MENU = [
  { id: 'm1', name: 'Món thử A', description: 'Mô tả A', price: 45000, price_m: 50000, price_l: 55000, image_url: null, alt_text: null, sort: 1, available: true },
  { id: 'm2', name: 'Món thử B', description: null, price: 1250000, price_m: null, price_l: null, image_url: null, alt_text: null, sort: 2, available: true },
];

test.beforeEach(async ({ page }) => {
  await mockTurnstile(page);
  await page.route('https://www.google.com/maps/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '' }));
  await mockSupabase(page, '/rest/v1/menu_items*', () => ({ status: 200, body: MENU }));
});

async function openOrder(page, orderFn) {
  await mockSupabase(page, '/functions/v1/order', orderFn || (() => ({ status: 200, body: { ok: true } })));
  await page.goto(APP);
  await page.getByRole('link', { name: 'Mua ngay Món thử A' }).click();
  await expect(page).toHaveURL(/\/dat-mon\?mon=m1$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Đặt món' })).toBeVisible();
}

async function fillValid(page) {
  await page.fill('#od-name', 'Nguyễn Văn A');
  await page.fill('#od-phone', '0986 187 111');
}

const submit = (page) => page.getByRole('button', { name: 'Đặt món', exact: true });

test.describe('từ menu', () => {
  test('mỗi món có nút Mua ngay', async ({ page }) => {
    await page.goto(APP);
    await expect(page.getByRole('link', { name: 'Mua ngay Món thử A' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mua ngay Món thử B' })).toBeVisible();
  });

  test('bấm Mua ngay mở trang đặt món với đúng món và giá', async ({ page }) => {
    await openOrder(page);
    await expect(page.getByRole('heading', { level: 2, name: 'Món thử A' })).toBeVisible();
    await expect(page.getByText('45.000đ').first()).toBeVisible();
    await expect(page.getByText('Tạm tính:')).toContainText('45.000đ');
  });

  test('đổi số lượng thì tạm tính nhân theo', async ({ page }) => {
    await openOrder(page);
    await page.fill('#od-qty', '2');
    await expect(page.getByText('Tạm tính:')).toContainText('90.000đ');
  });

  test('chọn size M thì tạm tính theo giá M', async ({ page }) => {
    await openOrder(page);
    await page.getByRole('radio', { name: 'Size M' }).click();
    await expect(page.getByText('Tạm tính:')).toContainText('50.000đ');
    await page.fill('#od-qty', '2');
    await expect(page.getByText('Tạm tính:')).toContainText('100.000đ');
  });

  test('món chỉ có size S thì M và L bị tắt', async ({ page }) => {
    await page.goto(APP + 'dat-mon?mon=m2');
    await expect(page.getByRole('heading', { level: 2, name: 'Món thử B' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Size S' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Size M' })).toBeDisabled();
    await expect(page.getByRole('radio', { name: 'Size L' })).toBeDisabled();
  });

  test('không chọn món thì hiện danh sách để chọn', async ({ page }) => {
    await page.goto(APP + 'dat-mon');
    await expect(page.getByText('Chọn món bạn muốn mua:')).toBeVisible();
    await page.getByRole('link', { name: /Món thử B/ }).click();
    await expect(page).toHaveURL(/mon=m2/);
    await expect(page.getByRole('heading', { level: 2, name: 'Món thử B' })).toBeVisible();
  });

  test('món không có trong menu thì báo không còn bán', async ({ page }) => {
    await page.goto(APP + 'dat-mon?mon=khong-co');
    await expect(page.getByText('Món này không còn bán.')).toBeVisible();
  });
});

test.describe('gửi đơn', () => {
  test('bỏ trống thì báo lỗi và không gửi', async ({ page }) => {
    let sent = false;
    await openOrder(page, () => { sent = true; return { status: 200, body: { ok: true } }; });
    await submit(page).click();
    await expect(page.getByText('Vui lòng nhập họ tên.')).toBeVisible();
    await expect(page.getByText('Vui lòng nhập số điện thoại.')).toBeVisible();
    await expect(page.locator('#od-name')).toBeFocused();
    expect(sent).toBe(false);
  });

  test('số lượng ngoài 1–20 thì báo lỗi', async ({ page }) => {
    let sent = false;
    await openOrder(page, () => { sent = true; return { status: 200, body: { ok: true } }; });
    await fillValid(page);
    await page.fill('#od-qty', '0');
    await page.locator('#od-qty').blur();
    await expect(page.getByText('Số lượng từ 1 đến 20.')).toBeVisible();
    await submit(page).click();
    expect(sent).toBe(false);
  });

  test('gửi thành công: gửi đúng dữ liệu, xóa form, hiện lời cảm ơn', async ({ page }) => {
    let body;
    await openOrder(page, (r) => { body = r.postDataJSON(); return { status: 200, body: { ok: true } }; });
    await fillValid(page);
    await page.fill('#od-qty', '2');
    await page.fill('#od-note', 'Ít đá');
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('đã nhận đơn');
    expect(body.token).toBe('token-gia');
    expect(body.order).toEqual({
      name: 'Nguyễn Văn A', phone: '0986187111', menu_item_id: 'm1',
      item_name: 'Món thử A', size: 'S', unit_price: 45000, quantity: 2, note: 'Ít đá',
    });
    await expect(page.getByRole('status')).toContainText('0986187111');
    await expect(page.locator('#od-name')).toHaveValue('');
    await expect(page.locator('#od-qty')).toHaveValue('1');
  });

  test('chọn size M thì gửi giá M', async ({ page }) => {
    let body;
    await openOrder(page, (r) => { body = r.postDataJSON(); return { status: 200, body: { ok: true } }; });
    await fillValid(page);
    await page.getByRole('radio', { name: 'Size M' }).click();
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('đã nhận đơn');
    expect(body.order).toMatchObject({ size: 'M', unit_price: 50000, item_name: 'Món thử A' });
  });

  test('chưa xác minh captcha thì không gửi và báo lỗi', async ({ page }) => {
    let called = false;
    await page.addInitScript(() => { window.turnstile = { render: () => 'w', reset: () => {}, remove: () => {} }; });
    await openOrder(page, () => { called = true; return { status: 200, body: {} }; });
    await fillValid(page);
    await submit(page).click();
    await expect(page.getByText('Vui lòng xác minh bạn không phải robot.')).toBeVisible();
    expect(called).toBe(false);
  });

  test('máy chủ báo captcha sai thì hiện thông báo xác minh', async ({ page }) => {
    await openOrder(page, () => ({ status: 400, body: { error: 'captcha' } }));
    await fillValid(page);
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('Xác minh không hợp lệ');
  });

  test('món hết bán (400 item) thì báo chọn món khác', async ({ page }) => {
    await openOrder(page, () => ({ status: 400, body: { error: 'item' } }));
    await fillValid(page);
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('không bán');
  });

  test('máy chủ lỗi thì báo đặt không thành công và chỉ số điện thoại', async ({ page }) => {
    await openOrder(page, () => ({ status: 500, body: {} }));
    await fillValid(page);
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('Đặt món không thành công');
    await expect(page.getByRole('status')).toContainText('0986 187 111');
    await expect(page.getByRole('status')).not.toContainText('187 186');
  });
});
