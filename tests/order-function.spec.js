// Kiểm tra hàm "order" bằng cách chạy chính mã trong prompt3/supabase-function/order.ts với dịch vụ giả.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { test, expect } = require('@playwright/test');

const js = esbuild.transformSync(fs.readFileSync(path.join(__dirname, '../prompt3/supabase-function/order.ts'), 'utf8'), { loader: 'ts' }).code;

const ITEM_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const GOOD = {
  name: 'Nguyễn Văn A', phone: '0986187111', menu_item_id: 'm1',
  item_name: 'Món thử A', unit_price: 45000, quantity: 2, note: 'Ít đá',
};
const GOOD_UUID = {
  name: 'Nguyễn Văn A', phone: '0986187111', menu_item_id: ITEM_ID,
  item_name: 'giá giả', unit_price: 1, quantity: 2, note: 'Ít đá',
};

function setup({ env, turnstileOk = true, items = [{ name: 'Latte', price: 50000, available: true }], insertStatus = 201, resendStatus = 200 } = {}) {
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (u.includes('challenges.cloudflare.com')) return json(200, { success: turnstileOk });
    if (u.includes('/rest/v1/menu_items')) return json(200, items);
    if (u.includes('/rest/v1/orders')) return new Response(null, { status: insertStatus });
    if (u.includes('api.resend.com')) {
      if (resendStatus === 'throw') throw new Error('mạng lỗi');
      return json(resendStatus, {});
    }
    return json(404, {});
  };
  let handler;
  const values = {
    TURNSTILE_SECRET_KEY: 'bi-mat', SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service-key', ...env,
  };
  new Function('Deno', 'fetch', js)({ serve: (fn) => { handler = fn; }, env: { get: (k) => values[k] } }, fakeFetch);
  const call = (body, method = 'POST') => handler(new Request('https://x.test/functions/v1/order', {
    method, body: method === 'POST' ? JSON.stringify(body) : undefined,
  }));
  return { call, calls };
}

test('OPTIONS trả về quyền CORS', async () => {
  const res = await setup().call(null, 'OPTIONS');
  expect(res.status).toBe(204);
  expect(res.headers.get('access-control-allow-origin')).toBe('https://jany-ne.github.io');
});

test('không có token captcha thì từ chối và không hỏi Cloudflare', async () => {
  const { call, calls } = setup();
  const res = await call({ order: GOOD });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('captcha');
  expect(calls).toHaveLength(0);
});

test('Cloudflare báo token không hợp lệ thì không lưu đơn', async () => {
  const { call, calls } = setup({ turnstileOk: false });
  const res = await call({ token: 't', order: GOOD });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('captcha');
  expect(calls.some((c) => c.url.includes('/rest/v1/orders'))).toBe(false);
});

for (const [ten, thayDoi] of [
  ['số điện thoại sai', { phone: '12345' }],
  ['tên trống', { name: '   ' }],
  ['số lượng bằng 0', { quantity: 0 }],
  ['số lượng quá 20', { quantity: 21 }],
  ['thiếu tên món (không phải uuid)', { menu_item_id: '', item_name: '  ', unit_price: 45000 }],
  ['giá âm', { menu_item_id: '', unit_price: -1 }],
]) {
  test(`dữ liệu không hợp lệ (${ten}) bị từ chối`, async () => {
    const { call, calls } = setup();
    const res = await call({ token: 't', order: { ...GOOD, ...thayDoi } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid');
    expect(calls.some((c) => c.url.includes('/rest/v1/orders'))).toBe(false);
  });
}

test('món uuid không tồn tại thì từ chối', async () => {
  const { call } = setup({ items: [] });
  const res = await call({ token: 't', order: GOOD_UUID });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('item');
});

test('món uuid đang ẩn thì từ chối', async () => {
  const { call } = setup({ items: [{ name: 'Latte', price: 50000, available: false }] });
  const res = await call({ token: 't', order: GOOD_UUID });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('item');
});

test('đơn không phải uuid được lưu bằng giá khách gửi', async () => {
  const { call, calls } = setup();
  const res = await call({ token: 't', order: GOOD });
  expect(res.status).toBe(200);
  const insert = calls.find((c) => c.url.endsWith('/rest/v1/orders'));
  expect(insert.init.headers.Authorization).toBe('Bearer service-key');
  expect(JSON.parse(insert.init.body)).toEqual({
    name: 'Nguyễn Văn A', phone: '0986187111', menu_item_id: null,
    item_name: 'Món thử A', unit_price: 45000, quantity: 2, note: 'Ít đá',
  });
});

test('đơn uuid lấy tên và giá từ cơ sở dữ liệu, không tin giá phía khách', async () => {
  const { call, calls } = setup();
  const res = await call({ token: 't', order: GOOD_UUID });
  expect(res.status).toBe(200);
  expect(JSON.parse(calls.find((c) => c.url.endsWith('/rest/v1/orders')).init.body)).toEqual({
    name: 'Nguyễn Văn A', phone: '0986187111', menu_item_id: ITEM_ID,
    item_name: 'Latte', unit_price: 50000, quantity: 2, note: 'Ít đá',
  });
});

test('ghi chú quá dài bị cắt còn 500 ký tự', async () => {
  const { call, calls } = setup();
  await call({ token: 't', order: { ...GOOD, note: 'a'.repeat(900) } });
  expect(JSON.parse(calls.find((c) => c.url.endsWith('/rest/v1/orders')).init.body).note).toHaveLength(500);
});

test('không cấu hình Resend thì không gửi email nhưng vẫn đặt được', async () => {
  const { call, calls } = setup();
  const res = await call({ token: 't', order: GOOD });
  expect(res.status).toBe(200);
  expect(calls.some((c) => c.url.includes('api.resend.com'))).toBe(false);
});

test('có cấu hình Resend thì gửi email thông báo cho chủ quán', async () => {
  const { call, calls } = setup({ env: { RESEND_API_KEY: 're_abc', NOTIFY_EMAIL: 'chu@quan.test' } });
  const res = await call({ token: 't', order: GOOD });
  expect(res.status).toBe(200);
  const sent = JSON.parse(calls.find((c) => c.url.includes('api.resend.com')).init.body);
  expect(sent.to).toEqual(['chu@quan.test']);
  expect(sent.subject).toContain('Nguyễn Văn A');
  expect(sent.html).toContain('Món thử A');
  expect(sent.html).toContain('90.000đ');
});

test('email thông báo không chèn được mã HTML từ tên khách', async () => {
  const { call, calls } = setup({ env: { RESEND_API_KEY: 're_abc', NOTIFY_EMAIL: 'chu@quan.test' } });
  await call({ token: 't', order: { ...GOOD, name: '<script>alert(1)</script>', note: '<img src=x onerror=1>' } });
  const html = JSON.parse(calls.find((c) => c.url.includes('api.resend.com')).init.body).html;
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('<img');
  expect(html).toContain('&lt;script&gt;');
});

test('gửi email lỗi vẫn không làm hỏng việc đặt món', async () => {
  for (const resendStatus of [500, 'throw']) {
    const { call } = setup({ env: { RESEND_API_KEY: 're_abc', NOTIFY_EMAIL: 'chu@quan.test' }, resendStatus });
    const res = await call({ token: 't', order: GOOD });
    expect(res.status).toBe(200);
  }
});
