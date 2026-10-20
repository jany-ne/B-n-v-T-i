// Kiểm thử chọn món, giỏ hàng và đặt món của bản React (app/dist, cổng 8081).
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

// Mở trang chọn món từ menu.
async function openItem(page, name = 'Món thử A') {
  await page.goto(APP);
  await page.getByRole('link', { name: `Thêm vào giỏ ${name}` }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Đặt món' })).toBeVisible();
}

const addToCart = (page) => page.getByRole('button', { name: 'Thêm vào giỏ', exact: true });
const submit = (page) => page.getByRole('button', { name: 'Đặt món', exact: true });

// Thêm một món vào giỏ rồi mở trang giỏ hàng.
async function addAndOpenCart(page, orderFn) {
  await mockSupabase(page, '/functions/v1/order', orderFn || (() => ({ status: 200, body: { ok: true } })));
  await openItem(page);
  await addToCart(page).click();
  await page.getByRole('link', { name: 'Xem giỏ hàng' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Giỏ hàng' })).toBeVisible();
}

async function fillValid(page) {
  await page.fill('#od-name', 'Nguyễn Văn A');
  await page.fill('#od-phone', '0986 187 111');
}

test.describe('chọn món', () => {
  test('mỗi món có nút Thêm vào giỏ', async ({ page }) => {
    await page.goto(APP);
    await expect(page.getByRole('link', { name: 'Thêm vào giỏ Món thử A' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Thêm vào giỏ Món thử B' })).toBeVisible();
  });

  test('mở trang chọn món với đúng món và giá', async ({ page }) => {
    await openItem(page);
    await expect(page).toHaveURL(/\/dat-mon\?mon=m1$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Món thử A' })).toBeVisible();
    await expect(page.getByText('Tạm tính:')).toContainText('45.000đ');
  });

  test('đổi số lượng thì tạm tính nhân theo', async ({ page }) => {
    await openItem(page);
    await page.fill('#od-qty', '2');
    await expect(page.getByText('Tạm tính:')).toContainText('90.000đ');
  });

  test('chọn size M thì tạm tính theo giá M', async ({ page }) => {
    await openItem(page);
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

  test('số lượng ngoài 1–20 thì báo lỗi và không thêm vào giỏ', async ({ page }) => {
    await openItem(page);
    await page.fill('#od-qty', '0');
    await addToCart(page).click();
    await expect(page.getByText('Số lượng từ 1 đến 20.')).toBeVisible();
    await expect(page.getByRole('link', { name: /^Giỏ hàng/ })).toHaveText('Giỏ hàng');
  });
});

test.describe('giỏ hàng', () => {
  test('thêm món thì hiện thông báo, số món trên menu trên cùng và món trong giỏ', async ({ page }) => {
    await openItem(page);
    await page.getByRole('radio', { name: 'Size M' }).click();
    await page.fill('#od-qty', '2');
    await addToCart(page).click();
    await expect(page.getByRole('status')).toContainText('Đã thêm 2 × Món thử A (size M)');
    await expect(page.getByRole('link', { name: 'Giỏ hàng (2)' })).toBeVisible();
    await page.getByRole('link', { name: 'Xem giỏ hàng' }).click();
    await expect(page.getByText('Món thử A size M', { exact: true })).toBeVisible();
    await expect(page.getByText('Tổng cộng:')).toContainText('100.000đ');
  });

  test('nhiều món: thêm tiếp món khác, cùng món cùng size thì cộng dồn', async ({ page }) => {
    await openItem(page);
    await addToCart(page).click();
    await page.getByRole('link', { name: 'Chọn thêm món' }).click();
    await page.getByRole('link', { name: /Món thử B/ }).click();
    await addToCart(page).click();
    await page.getByRole('link', { name: 'Chọn thêm món' }).click();
    await page.getByRole('link', { name: /Món thử A/ }).click();
    await addToCart(page).click();
    await page.getByRole('link', { name: 'Xem giỏ hàng' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: 'Món thử A size S' })).toHaveCount(1);
    await expect(page.getByLabel('Số lượng Món thử A size S')).toHaveValue('2');
    await expect(page.getByLabel('Số lượng Món thử B size S')).toHaveValue('1');
    await expect(page.getByText('Tổng cộng:')).toContainText('1.340.000đ');
  });

  test('đổi số lượng và xóa món cập nhật tổng tiền', async ({ page }) => {
    await addAndOpenCart(page);
    await page.getByLabel('Số lượng Món thử A size S').fill('3');
    await expect(page.getByText('Tổng cộng:')).toContainText('135.000đ');
    await page.getByRole('button', { name: 'Xóa Món thử A size S khỏi giỏ' }).click();
    await expect(page.getByText('Giỏ hàng đang trống.')).toBeVisible();
  });

  test('giỏ hàng được giữ khi tải lại trang', async ({ page }) => {
    await addAndOpenCart(page);
    await page.reload();
    await expect(page.getByText('Món thử A size S', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Giỏ hàng (1)' })).toBeVisible();
  });

  test('giỏ trống thì không có form đặt', async ({ page }) => {
    await page.goto(APP + 'gio-hang');
    await expect(page.getByText('Giỏ hàng đang trống.')).toBeVisible();
    await expect(submit(page)).toHaveCount(0);
  });

  test('giá trong giỏ cập nhật theo menu mới', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ban-va-toi-cart', JSON.stringify([{ id: 'm1', name: 'Tên cũ', size: 'S', unitPrice: 1000, qty: 1 }]));
    });
    await page.goto(APP + 'gio-hang');
    await expect(page.getByText('Món thử A size S', { exact: true })).toBeVisible();
    await expect(page.getByText('Tổng cộng:')).toContainText('45.000đ');
  });

  test('món không còn bán thì báo và không cho đặt', async ({ page }) => {
    let sent = false;
    await mockSupabase(page, '/functions/v1/order', () => { sent = true; return { status: 200, body: {} }; });
    await page.addInitScript(() => {
      localStorage.setItem('ban-va-toi-cart', JSON.stringify([{ id: 'da-xoa', name: 'Món đã xóa', size: 'S', unitPrice: 1000, qty: 1 }]));
    });
    await page.goto(APP + 'gio-hang');
    await expect(page.getByText('Món này không còn bán hoặc không có size này.')).toBeVisible();
    await fillValid(page);
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('Có món không còn bán');
    expect(sent).toBe(false);
  });

  test('dữ liệu giỏ hỏng trong bộ nhớ thì bỏ qua, trang vẫn chạy', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ban-va-toi-cart', '{khong phai json'));
    await page.goto(APP + 'gio-hang');
    await expect(page.getByText('Giỏ hàng đang trống.')).toBeVisible();
  });
});

test.describe('gửi đơn', () => {
  test('bỏ trống thì báo lỗi và không gửi', async ({ page }) => {
    let sent = false;
    await addAndOpenCart(page, () => { sent = true; return { status: 200, body: { ok: true } }; });
    await submit(page).click();
    await expect(page.getByText('Vui lòng nhập họ tên.')).toBeVisible();
    await expect(page.getByText('Vui lòng nhập số điện thoại.')).toBeVisible();
    await expect(page.locator('#od-name')).toBeFocused();
    expect(sent).toBe(false);
  });

  test('gửi thành công: gửi đủ các món, xóa giỏ và form, hiện lời cảm ơn', async ({ page }) => {
    let body;
    await mockSupabase(page, '/functions/v1/order', (r) => { body = r.postDataJSON(); return { status: 200, body: { ok: true } }; });
    await openItem(page);
    await page.fill('#od-qty', '2');
    await addToCart(page).click();
    await page.getByRole('link', { name: 'Chọn thêm món' }).click();
    await page.getByRole('link', { name: /Món thử A/ }).click();
    await page.getByRole('radio', { name: 'Size M' }).click();
    await addToCart(page).click();
    await page.getByRole('link', { name: 'Chọn thêm món' }).click();
    await page.getByRole('link', { name: /Món thử B/ }).click();
    await addToCart(page).click();
    await page.getByRole('link', { name: 'Xem giỏ hàng' }).click();
    await fillValid(page);
    await page.fill('#od-note', 'Ít đá');
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('đã nhận đơn');
    await expect(page.getByRole('status')).toContainText('0986187111');
    expect(body.token).toBe('token-gia');
    expect(body.order).toEqual({
      name: 'Nguyễn Văn A', phone: '0986187111', note: 'Ít đá',
      items: [
        { menu_item_id: 'm1', item_name: 'Món thử A', size: 'S', unit_price: 45000, quantity: 2 },
        { menu_item_id: 'm1', item_name: 'Món thử A', size: 'M', unit_price: 50000, quantity: 1 },
        { menu_item_id: 'm2', item_name: 'Món thử B', size: 'S', unit_price: 1250000, quantity: 1 },
      ],
    });
    // Giỏ đã được xóa, cả trên menu trên cùng lẫn sau khi tải lại trang
    await expect(page.getByRole('link', { name: 'Giỏ hàng', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Giỏ hàng đang trống.')).toBeVisible();
  });

  test('chưa xác minh captcha thì không gửi và báo lỗi', async ({ page }) => {
    let called = false;
    await page.addInitScript(() => { window.turnstile = { render: () => 'w', reset: () => {}, remove: () => {} }; });
    await addAndOpenCart(page, () => { called = true; return { status: 200, body: {} }; });
    await fillValid(page);
    await submit(page).click();
    await expect(page.getByText('Vui lòng xác minh bạn không phải robot.')).toBeVisible();
    expect(called).toBe(false);
  });

  test('máy chủ báo captcha sai thì hiện thông báo xác minh và giữ giỏ', async ({ page }) => {
    await addAndOpenCart(page, () => ({ status: 400, body: { error: 'captcha' } }));
    await fillValid(page);
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('Xác minh không hợp lệ');
    await expect(page.getByText('Món thử A size S', { exact: true })).toBeVisible();
  });

  test('món hết bán (400 item) thì báo kiểm tra lại giỏ', async ({ page }) => {
    await addAndOpenCart(page, () => ({ status: 400, body: { error: 'item' } }));
    await fillValid(page);
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('kiểm tra lại giỏ hàng');
  });

  test('máy chủ lỗi thì báo đặt không thành công, giữ giỏ và chỉ số điện thoại', async ({ page }) => {
    await addAndOpenCart(page, () => ({ status: 500, body: {} }));
    await fillValid(page);
    await submit(page).click();
    await expect(page.getByRole('status')).toContainText('Đặt món không thành công');
    await expect(page.getByRole('status')).toContainText('0986 187 111');
    await expect(page.getByRole('status')).not.toContainText('187 186');
    await expect(page.getByText('Món thử A size S', { exact: true })).toBeVisible();
  });
});
