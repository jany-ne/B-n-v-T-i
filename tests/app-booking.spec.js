// Kiểm thử trang Đặt bàn và chuyển trang của bản React (app/dist, cổng 8081).
const { test, expect } = require('@playwright/test');
const { mockSupabase, mockTurnstile, futureDate, TABLES } = require('./helpers');

const APP = 'http://localhost:8081/';

test.beforeEach(async ({ page }) => {
  await mockTurnstile(page);
  await page.route('https://www.google.com/maps/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '' }));
  await mockSupabase(page, '/rest/v1/menu_items*');
});

// Mở trang đặt bàn với dữ liệu giả: Bàn 1 đã có người đặt vào khung giờ được chọn.
async function openBooking(page, bookFn) {
  await mockSupabase(page, '/rest/v1/restaurant_tables*', () => ({ status: 200, body: TABLES }));
  await mockSupabase(page, '/rest/v1/rpc/get_taken_tables', () => ({ status: 200, body: [{ table_id: 'B1' }] }));
  await mockSupabase(page, '/functions/v1/book', bookFn || (() => ({ status: 200, body: { ok: true } })));
  await page.goto(APP + 'dat-ban');
  await expect(page.locator('fieldset label')).toHaveCount(3);
}

async function fillValid(page) {
  await page.fill('#bk-name', 'Nguyễn Văn A');
  await page.fill('#bk-phone', '0986 187 111');
  await page.fill('#bk-date', futureDate());
  await page.selectOption('#bk-time', '19:00');
}

const submit = (page) => page.getByRole('button', { name: 'Đặt bàn', exact: true });
const table = (page, name) => page.locator('fieldset label', { hasText: name });

test.describe('chuyển trang', () => {
  test('nút "Đặt bàn ngay" ở trang chủ mở trang đặt bàn', async ({ page }) => {
    await mockSupabase(page, '/rest/v1/restaurant_tables*', () => ({ status: 200, body: TABLES }));
    await page.goto(APP);
    await page.getByRole('link', { name: 'Đặt bàn ngay' }).click();
    await expect(page).toHaveURL(/\/dat-ban$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Đặt bàn' })).toBeVisible();
  });

  test('từ trang đặt bàn bấm Menu thì về trang chủ và cuộn tới phần menu', async ({ page }) => {
    await openBooking(page);
    await page.getByRole('contentinfo').getByRole('link', { name: 'Menu' }).click();
    await expect(page).toHaveURL(APP);
    await expect(page.locator('#menu')).toBeInViewport();
  });

  test('mục Đặt bàn trên menu mở trang đặt bàn và cuộn về đầu trang', async ({ page }) => {
    await mockSupabase(page, '/rest/v1/restaurant_tables*', () => ({ status: 200, body: TABLES }));
    await page.goto(APP);
    await page.locator('#lien-he').scrollIntoViewIfNeeded();
    await page.getByRole('contentinfo').getByRole('link', { name: 'Đặt bàn' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Đặt bàn' })).toBeInViewport();
  });

  test('địa chỉ cũ dạng #/dat-ban tự chuyển sang địa chỉ sạch', async ({ page }) => {
    await mockSupabase(page, '/rest/v1/restaurant_tables*', () => ({ status: 200, body: TABLES }));
    await page.goto(APP + '#/dat-ban');
    await expect(page).toHaveURL(APP + 'dat-ban');
    await expect(page.getByRole('heading', { level: 1, name: 'Đặt bàn' })).toBeVisible();
  });

  test('tải lại trang đặt bàn vẫn ở đúng trang, địa chỉ không có dấu #', async ({ page }) => {
    await openBooking(page);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Đặt bàn' })).toBeVisible();
    expect(page.url()).not.toContain('#');
  });

  test('địa chỉ lạ thì hiện trang chủ', async ({ page }) => {
    await page.goto(APP + 'khong-ton-tai');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Một tách cà phê');
  });

  test('mở thẳng địa chỉ trang đặt bàn vẫn hiện đúng trang', async ({ page }) => {
    await openBooking(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Đặt bàn' })).toBeVisible();
  });
});

test.describe('form đặt bàn', () => {
  test('gửi form trống thì hiện lỗi và không gọi máy chủ', async ({ page }) => {
    let called = false;
    await openBooking(page, () => { called = true; return { status: 200, body: {} }; });
    await submit(page).click();
    await expect(page.getByText('Vui lòng nhập họ tên.')).toBeVisible();
    await expect(page.getByText('Vui lòng nhập số điện thoại.')).toBeVisible();
    await expect(page.getByText('Vui lòng chọn ngày.')).toBeVisible();
    await expect(page.getByText('Vui lòng chọn giờ.')).toBeVisible();
    await expect(page.locator('#bk-name')).toBeFocused();
    expect(called).toBe(false);
  });

  test('số điện thoại sai và ngày trong quá khứ bị báo lỗi', async ({ page }) => {
    await openBooking(page);
    await page.fill('#bk-phone', '12345');
    await page.locator('#bk-phone').blur();
    await expect(page.getByText('Số điện thoại chưa đúng')).toBeVisible();
    await page.fill('#bk-date', '2020-01-01');
    await page.locator('#bk-date').blur();
    await expect(page.getByText('Ngày đặt không được ở quá khứ.')).toBeVisible();
  });

  test('chưa chọn ngày giờ thì các bàn bị khóa và có hướng dẫn', async ({ page }) => {
    await openBooking(page);
    await expect(table(page, 'Bàn 2').locator('input')).toBeDisabled();
    await expect(page.getByText('Chọn ngày, giờ và số người để xem bàn trống.')).toBeVisible();
  });

  test('bàn đã có người đặt bị khóa, bàn không đủ chỗ cũng bị khóa', async ({ page }) => {
    await openBooking(page);
    await fillValid(page);
    await expect(table(page, 'Bàn 1')).toContainText('Đã có người đặt');
    await expect(table(page, 'Bàn 1').locator('input')).toBeDisabled();
    await expect(table(page, 'Bàn 2')).toContainText('2 chỗ');
    await expect(table(page, 'Bàn 2').locator('input')).toBeEnabled();

    await page.fill('#bk-guests', '4');
    await expect(table(page, 'Bàn 2')).toContainText('Không đủ chỗ');
    await expect(table(page, 'Bàn 5').locator('input')).toBeEnabled();
  });

  test('đổi số người làm bàn đang chọn không còn đủ chỗ thì bỏ chọn', async ({ page }) => {
    await openBooking(page);
    await fillValid(page);
    await table(page, 'Bàn 2').click();
    await expect(table(page, 'Bàn 2').locator('input')).toBeChecked();
    await page.fill('#bk-guests', '4');
    await expect(table(page, 'Bàn 2').locator('input')).not.toBeChecked();
  });

  test('không chọn bàn thì không gửi được', async ({ page }) => {
    await openBooking(page);
    await fillValid(page);
    await submit(page).click();
    await expect(page.getByText('Vui lòng chọn bàn.')).toBeVisible();
  });

  test('đặt bàn thành công: gửi đúng dữ liệu, hiện lời cảm ơn, xóa form', async ({ page }) => {
    let sent;
    await openBooking(page, (r) => { sent = r.postDataJSON(); return { status: 200, body: { ok: true } }; });
    await fillValid(page);
    await page.fill('#bk-note', 'Gần cửa sổ');
    await table(page, 'Bàn 2').click();
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('Cảm ơn bạn');
    await expect(page.getByRole('status')).toContainText('0986187111');
    expect(sent.token).toBe('token-gia');
    expect(sent.booking).toEqual({
      name: 'Nguyễn Văn A', phone: '0986187111', booking_date: futureDate(), booking_time: '19:00', guests: 2, table_id: 'B2', note: 'Gần cửa sổ',
    });
    await expect(page.locator('#bk-name')).toHaveValue('');
    await expect(page.locator('#bk-guests')).toHaveValue('2');
  });

  test('bàn vừa bị người khác đặt (409) thì báo chọn bàn khác và bỏ chọn', async ({ page }) => {
    await openBooking(page, () => ({ status: 409, body: { error: 'conflict' } }));
    await fillValid(page);
    await table(page, 'Bàn 2').click();
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('vừa được người khác đặt');
    await expect(table(page, 'Bàn 2').locator('input')).not.toBeChecked();
    await expect(submit(page)).toBeEnabled();
  });

  test('chưa xác minh captcha thì không gửi và báo lỗi', async ({ page }) => {
    let called = false;
    await page.addInitScript(() => { window.turnstile = { render: () => 'w', reset: () => {}, remove: () => {} }; });
    await openBooking(page, () => { called = true; return { status: 200, body: {} }; });
    await fillValid(page);
    await table(page, 'Bàn 2').click();
    await submit(page).click();
    await expect(page.getByText('Vui lòng xác minh bạn không phải robot.')).toBeVisible();
    expect(called).toBe(false);
  });

  test('máy chủ báo captcha sai thì hiện thông báo xác minh', async ({ page }) => {
    await openBooking(page, () => ({ status: 400, body: { error: 'captcha' } }));
    await fillValid(page);
    await table(page, 'Bàn 2').click();
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('Xác minh không hợp lệ');
  });

  test('máy chủ lỗi thì báo đặt không thành công và chỉ số điện thoại', async ({ page }) => {
    await openBooking(page, () => ({ status: 500, body: {} }));
    await fillValid(page);
    await table(page, 'Bàn 2').click();
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('0986 187 111');
    await expect(submit(page)).toBeEnabled();
  });
});
