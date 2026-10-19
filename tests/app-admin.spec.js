// Kiểm thử trang quản lý của bản React (app/dist, cổng 8081).
const { test, expect } = require('@playwright/test');
const { mockSupabase, mockTurnstile, makePng } = require('./helpers');

const APP = 'http://localhost:8081/';
const BOOKINGS = [
  { id: 'b-1', booking_date: '2031-01-01', booking_time: '19:00:00', name: 'Khách Một', phone: '0986187111', guests: 2, note: 'Gần cửa sổ', restaurant_tables: { name: 'Bàn 2' } },
  { id: 'b-2', booking_date: '2031-01-02', booking_time: '12:30:00', name: 'Khách Hai', phone: '0900000000', guests: 4, note: null, restaurant_tables: { name: 'Bàn 5' } },
];
const MENU = [
  { id: 'm-1', name: 'Cà phê sữa', description: 'Đậm đà', price: 35000, image_url: 'images/ca-phe-sua.jpg', alt_text: 'Ly cà phê', sort: 1, available: true },
  { id: 'm-2', name: 'Trà đào', description: null, price: 40000, image_url: null, alt_text: null, sort: 2, available: false },
];
const PNG = makePng();

test.beforeEach(async ({ page }) => {
  await mockTurnstile(page);
  page.on('dialog', (d) => d.accept());
});

// Dựng các địa chỉ Supabase giả và ghi lại các yêu cầu để test kiểm tra.
async function setup(page, { loginOk = true, bookingsStatus = 200, storageStatus = 200 } = {}) {
  const seen = { login: [], bookings: [], menu: [], upload: [] };
  await mockSupabase(page, '/auth/v1/token*', (r) => {
    seen.login.push(r.postDataJSON());
    return loginOk ? { status: 200, body: { access_token: 'tok-1', expires_in: 3600 } } : { status: 400, body: { error: 'invalid' } };
  });
  await mockSupabase(page, '/rest/v1/bookings*', (r) => {
    seen.bookings.push({ method: r.method(), url: r.url(), auth: r.headers().authorization });
    if (r.method() === 'GET') return { status: bookingsStatus, body: bookingsStatus === 200 ? BOOKINGS : {} };
    return { status: 200, body: [] };
  });
  await mockSupabase(page, '/rest/v1/menu_items*', (r) => {
    seen.menu.push({ method: r.method(), url: r.url(), body: r.method() === 'GET' || r.method() === 'DELETE' ? null : r.postDataJSON() });
    return { status: 200, body: r.method() === 'GET' ? MENU : [] };
  });
  await mockSupabase(page, '/storage/v1/object/menu-images/*', (r) => {
    seen.upload.push({ type: r.headers()['content-type'], auth: r.headers().authorization, size: r.postDataBuffer().length });
    return { status: storageStatus, body: {} };
  });
  return seen;
}

async function login(page) {
  await page.goto(APP + '#/quan-ly');
  await page.fill('#ad-email', 'chu@quan.test');
  await page.fill('#ad-password', 'mat-khau');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('heading', { name: 'Đơn đặt bàn' })).toBeVisible();
}

const bookingRow = (page, text) => page.locator('section[aria-labelledby="bookings-title"] tbody tr', { hasText: text });
const menuRow = (page, text) => page.locator('section[aria-labelledby="menu-admin-title"] tbody tr', { hasText: text });

test.describe('đăng nhập', () => {
  test('đăng nhập đúng thì hiện danh sách đơn và menu, gửi kèm token', async ({ page }) => {
    const seen = await setup(page);
    await login(page);
    expect(seen.login[0]).toEqual({ email: 'chu@quan.test', password: 'mat-khau' });
    await expect(page.locator('section[aria-labelledby="bookings-title"] tbody tr')).toHaveCount(2);
    await expect(bookingRow(page, 'Khách Một')).toContainText('01/01/2031');
    await expect(bookingRow(page, 'Khách Một')).toContainText('19:00');
    await expect(bookingRow(page, 'Khách Một')).toContainText('Bàn 2:');
    await expect(page.locator('section[aria-labelledby="menu-admin-title"] tbody tr')).toHaveCount(2);
    expect(seen.bookings[0].auth).toBe('Bearer tok-1');
    await expect(page.locator('#ad-email')).toHaveCount(0);
  });

  test('sai mật khẩu thì báo lỗi và không hiện danh sách', async ({ page }) => {
    await setup(page, { loginOk: false });
    await page.goto(APP + '#/quan-ly');
    await page.fill('#ad-email', 'chu@quan.test');
    await page.fill('#ad-password', 'sai');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByText('Email hoặc mật khẩu không đúng.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Đơn đặt bàn' })).toHaveCount(0);
  });

  test('tải lại trang vẫn giữ đăng nhập', async ({ page }) => {
    await setup(page);
    await login(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Đơn đặt bàn' })).toBeVisible();
  });

  test('đăng xuất thì quay về màn hình đăng nhập và tải lại vẫn phải đăng nhập', async ({ page }) => {
    await setup(page);
    await login(page);
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(page.locator('#ad-email')).toBeVisible();
    await page.reload();
    await expect(page.locator('#ad-email')).toBeVisible();
  });

  test('phiên hết hạn (401) thì quay về đăng nhập kèm thông báo', async ({ page }) => {
    await setup(page, { bookingsStatus: 401 });
    await page.addInitScript(() => sessionStorage.setItem('booking-admin-session', JSON.stringify({ t: 'cu', exp: Date.now() + 3600000 })));
    await page.goto(APP + '#/quan-ly');
    await expect(page.getByText('hết hạn')).toBeVisible();
    await expect(page.locator('#ad-email')).toBeVisible();
  });

  test('menu: Login đổi thành Logout và hiện mục Quản lý khi đã đăng nhập', async ({ page }) => {
    await setup(page);
    await mockSupabase(page, '/rest/v1/menu_items*');
    await page.goto(APP);
    const nav = page.locator('#site-nav');
    await expect(nav.getByRole('link', { name: 'Login' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Quản lý' })).toHaveCount(0);

    await nav.getByRole('link', { name: 'Login' }).click();
    await page.fill('#ad-email', 'chu@quan.test');
    await page.fill('#ad-password', 'mat-khau');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(nav.getByRole('button', { name: 'Logout' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Quản lý' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Login' })).toHaveCount(0);

    await nav.getByRole('button', { name: 'Logout' }).click();
    await expect(nav.getByRole('link', { name: 'Login' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Quản lý' })).toHaveCount(0);
  });
});

test.describe('đơn đặt bàn', () => {
  test('xóa một đơn gọi đúng yêu cầu DELETE', async ({ page }) => {
    const seen = await setup(page);
    await login(page);
    await bookingRow(page, 'Khách Hai').getByRole('button', { name: /Xóa/ }).click();
    await expect.poll(() => seen.bookings.some((b) => b.method === 'DELETE' && b.url.includes('id=eq.b-2'))).toBe(true);
  });

  test('tên khách chứa mã HTML được hiện như chữ thường, không chạy mã', async ({ page }) => {
    await setup(page);
    await page.route('https://favkwkfugnrpwmecpjka.supabase.co/rest/v1/bookings*', (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
      return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
        body: JSON.stringify([{ ...BOOKINGS[0], name: '<img src=x onerror="window.hacked=1">' }]) });
    });
    await login(page);
    await expect(page.locator('section[aria-labelledby="bookings-title"] tbody tr').first()).toContainText('<img src=x');
    expect(await page.evaluate(() => window.hacked)).toBeUndefined();
  });
});

test.describe('quản lý menu', () => {
  test('thêm món gửi đúng dữ liệu', async ({ page }) => {
    const seen = await setup(page);
    await login(page);
    await page.fill('#mn-name', 'Sinh tố bơ');
    await page.fill('#mn-desc', 'Béo ngậy');
    await page.fill('#mn-price', '55000');
    await page.getByRole('button', { name: 'Thêm món' }).click();
    await expect(page.getByText('Đã thêm món.')).toBeVisible();
    const post = seen.menu.find((m) => m.method === 'POST');
    expect(post.body).toMatchObject({ name: 'Sinh tố bơ', description: 'Béo ngậy', price: 55000, available: true, image_url: null });
  });

  test('thiếu tên hoặc giá sai thì báo lỗi và không gửi', async ({ page }) => {
    const seen = await setup(page);
    await login(page);
    await page.getByRole('button', { name: 'Thêm món' }).click();
    await expect(page.getByText('Vui lòng nhập tên món.')).toBeVisible();
    await page.fill('#mn-name', 'Món X');
    await page.fill('#mn-price', '-5');
    await page.getByRole('button', { name: 'Thêm món' }).click();
    await expect(page.getByText('Giá phải là số nguyên')).toBeVisible();
    expect(seen.menu.some((m) => m.method === 'POST')).toBe(false);
  });

  test('sửa món điền sẵn form rồi gửi PATCH đúng món', async ({ page }) => {
    const seen = await setup(page);
    await login(page);
    await menuRow(page, 'Trà đào').getByRole('button', { name: /Sửa/ }).click();
    await expect(page.locator('#mn-name')).toHaveValue('Trà đào');
    await expect(page.locator('#mn-price')).toHaveValue('40000');
    await expect(page.locator('#mn-available')).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Lưu thay đổi' })).toBeVisible();
    await page.fill('#mn-price', '42000');
    await page.check('#mn-available');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.getByText('Đã lưu thay đổi.')).toBeVisible();
    const patch = seen.menu.find((m) => m.method === 'PATCH');
    expect(patch.url).toContain('id=eq.m-2');
    expect(patch.body).toMatchObject({ name: 'Trà đào', price: 42000, available: true });
  });

  test('xóa món gọi đúng yêu cầu DELETE', async ({ page }) => {
    const seen = await setup(page);
    await login(page);
    await menuRow(page, 'Cà phê sữa').getByRole('button', { name: /Xóa/ }).click();
    await expect.poll(() => seen.menu.some((m) => m.method === 'DELETE' && m.url.includes('id=eq.m-1'))).toBe(true);
  });
});

test.describe('upload và cắt ảnh', () => {
  const crop = (page) => page.getByLabel(/Vùng cắt ảnh/);

  test('chọn ảnh thì hiện khung cắt, bấm dùng ảnh thì tải lên và hiện xem trước', async ({ page }) => {
    const seen = await setup(page);
    await login(page);
    await expect(crop(page)).toHaveCount(0);
    await page.setInputFiles('#mn-file', { name: 'anh.png', mimeType: 'image/png', buffer: PNG });
    await expect(crop(page)).toBeVisible();

    await page.fill('#mn-crop-zoom', '2');
    await page.getByRole('button', { name: 'Dùng ảnh này' }).click();
    await expect(page.getByText('Đã tải ảnh lên.')).toBeVisible();
    await expect(crop(page)).toHaveCount(0);
    await expect(page.getByAltText('Ảnh món đã chọn')).toHaveAttribute('src', /\/storage\/v1\/object\/public\/menu-images\/.+\.jpg$/);
    expect(seen.upload[0].type).toBe('image/jpeg');
    expect(seen.upload[0].auth).toBe('Bearer tok-1');
    expect(seen.upload[0].size).toBeGreaterThan(100);
    await expect(page.getByRole('button', { name: 'Chỉnh vị trí cắt' })).toBeVisible();
  });

  test('có thể chỉnh lại vùng cắt của ảnh vừa chọn', async ({ page }) => {
    const seen = await setup(page);
    await login(page);
    await page.setInputFiles('#mn-file', { name: 'anh.png', mimeType: 'image/png', buffer: PNG });
    await page.getByRole('button', { name: 'Dùng ảnh này' }).click();
    await expect(page.getByText('Đã tải ảnh lên.')).toBeVisible();
    await page.getByRole('button', { name: 'Chỉnh vị trí cắt' }).click();
    await expect(crop(page)).toBeVisible();
    await crop(page).press('ArrowRight'); // phím mũi tên không được gây lỗi
    await page.getByRole('button', { name: 'Dùng ảnh này' }).click();
    await expect.poll(() => seen.upload.length).toBe(2);
  });

  test('ảnh đã tải lên được lưu vào món khi bấm thêm', async ({ page }) => {
    const seen = await setup(page);
    await login(page);
    await page.setInputFiles('#mn-file', { name: 'anh.png', mimeType: 'image/png', buffer: PNG });
    await page.getByRole('button', { name: 'Dùng ảnh này' }).click();
    await expect(page.getByText('Đã tải ảnh lên.')).toBeVisible();
    await page.fill('#mn-name', 'Món có ảnh');
    await page.fill('#mn-price', '30000');
    await page.getByRole('button', { name: 'Thêm món' }).click();
    await expect(page.getByText('Đã thêm món.')).toBeVisible();
    expect(seen.menu.find((m) => m.method === 'POST').body.image_url).toMatch(/menu-images\/.+\.jpg$/);
  });

  test('bấm Hủy thì đóng khung cắt và không tải gì lên', async ({ page }) => {
    const seen = await setup(page);
    await login(page);
    await page.setInputFiles('#mn-file', { name: 'anh.png', mimeType: 'image/png', buffer: PNG });
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(crop(page)).toHaveCount(0);
    expect(seen.upload).toHaveLength(0);
  });

  test('file không phải ảnh bị từ chối', async ({ page }) => {
    await setup(page);
    await login(page);
    await page.setInputFiles('#mn-file', { name: 'ghi-chu.txt', mimeType: 'text/plain', buffer: Buffer.from('xin chao') });
    await expect(page.getByText('Chỉ nhận ảnh JPG, PNG hoặc WebP.')).toBeVisible();
    await expect(crop(page)).toHaveCount(0);
  });

  test('tải lên thất bại thì báo lỗi và không có ảnh', async ({ page }) => {
    await setup(page, { storageStatus: 403 });
    await login(page);
    await page.setInputFiles('#mn-file', { name: 'anh.png', mimeType: 'image/png', buffer: PNG });
    await page.getByRole('button', { name: 'Dùng ảnh này' }).click();
    await expect(page.getByText('Tải ảnh không thành công')).toBeVisible();
    await expect(page.getByAltText('Ảnh món đã chọn')).toHaveCount(0);
  });

  test('sửa món có ảnh thì hiện ảnh, bấm Bỏ ảnh thì xóa ảnh khỏi món', async ({ page }) => {
    const seen = await setup(page);
    await login(page);
    await menuRow(page, 'Cà phê sữa').getByRole('button', { name: /Sửa/ }).click();
    await expect(page.getByAltText('Ảnh món đã chọn')).toBeVisible();
    await page.getByRole('button', { name: 'Bỏ ảnh' }).click();
    await expect(page.getByAltText('Ảnh món đã chọn')).toHaveCount(0);
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.getByText('Đã lưu thay đổi.')).toBeVisible();
    expect(seen.menu.find((m) => m.method === 'PATCH').body.image_url).toBeNull();
  });
});
