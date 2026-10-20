// Kiểm tra hàm "order" bằng cách chạy chính mã trong prompt3/supabase-function/order.ts với dịch vụ giả.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { test, expect } = require('@playwright/test');

const js = esbuild.transformSync(fs.readFileSync(path.join(__dirname, '../prompt3/supabase-function/order.ts'), 'utf8'), { loader: 'ts' }).code;

const ITEM_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const ITEM_ID_2 = 'bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee';

// Món không có mã uuid (menu dự phòng): hàm tin tên và giá khách gửi.
const LINE = { menu_item_id: '1', item_name: 'Món thử A', unit_price: 45000, quantity: 2, size: 'S' };
// Món có mã uuid: hàm lấy tên và giá thật từ cơ sở dữ liệu.
const LINE_UUID = { menu_item_id: ITEM_ID, item_name: 'giá giả', unit_price: 1, quantity: 2, size: 'S' };
const order = (o = {}) => ({ name: 'Nguyễn Văn A', phone: '0986187111', note: 'Ít đá', items: [LINE], ...o });

const LATTE = { id: ITEM_ID, name: 'Latte', price: 50000, price_m: 55000, price_l: 60000, available: true };
const TRA = { id: ITEM_ID_2, name: 'Trà đào', price: 40000, price_m: null, price_l: null, available: true };

function setup({ env, turnstileOk = true, items = [LATTE, TRA], insertStatus = 201, itemsInsertStatus = 201, resendStatus = 200 } = {}) {
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (u.includes('challenges.cloudflare.com')) return json(200, { success: turnstileOk });
    if (u.includes('/rest/v1/menu_items')) return json(200, items);
    if (u.includes('/rest/v1/order_items')) return new Response(null, { status: itemsInsertStatus });
    if (u.includes('/rest/v1/orders')) return new Response(null, { status: init.method === 'DELETE' ? 204 : insertStatus });
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
  new Function('Deno', 'fetch', 'crypto', js)({ serve: (fn) => { handler = fn; }, env: { get: (k) => values[k] } }, fakeFetch, globalThis.crypto);
  const call = (body, method = 'POST') => handler(new Request('https://x.test/functions/v1/order', {
    method, body: method === 'POST' ? JSON.stringify(body) : undefined,
  }));
  const sent = (suffix, method = 'POST') => calls.filter((c) => c.url.endsWith(suffix) && (c.init.method ?? 'GET') === method);
  return { call, calls, sent };
}

test('OPTIONS trả về quyền CORS', async () => {
  const res = await setup().call(null, 'OPTIONS');
  expect(res.status).toBe(204);
  expect(res.headers.get('access-control-allow-origin')).toBe('https://jany-ne.github.io');
});

test('không có token captcha thì từ chối và không hỏi Cloudflare', async () => {
  const { call, calls } = setup();
  const res = await call({ order: order() });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('captcha');
  expect(calls).toHaveLength(0);
});

test('Cloudflare báo token không hợp lệ thì không lưu đơn', async () => {
  const { call, calls } = setup({ turnstileOk: false });
  const res = await call({ token: 't', order: order() });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('captcha');
  expect(calls.some((c) => c.url.includes('/rest/v1/orders'))).toBe(false);
});

for (const [ten, thayDoi] of [
  ['số điện thoại sai', { phone: '12345' }],
  ['tên trống', { name: '   ' }],
  ['giỏ không có món', { items: [] }],
  ['items không phải danh sách', { items: 'abc' }],
  ['quá 20 dòng món', { items: Array.from({ length: 21 }, () => LINE) }],
  ['số lượng bằng 0', { items: [{ ...LINE, quantity: 0 }] }],
  ['số lượng quá 20', { items: [{ ...LINE, quantity: 21 }] }],
  ['một dòng sai trong nhiều dòng', { items: [LINE, { ...LINE, quantity: 0 }] }],
  ['thiếu tên món (không phải uuid)', { items: [{ ...LINE, menu_item_id: '', item_name: '  ' }] }],
  ['giá âm', { items: [{ ...LINE, menu_item_id: '', unit_price: -1 }] }],
  ['size không hợp lệ', { items: [{ ...LINE, size: 'XL' }] }],
]) {
  test(`dữ liệu không hợp lệ (${ten}) bị từ chối`, async () => {
    const { call, calls } = setup();
    const res = await call({ token: 't', order: order(thayDoi) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid');
    expect(calls.some((c) => c.url.includes('/rest/v1/orders'))).toBe(false);
  });
}

test('có món uuid không tồn tại thì từ chối cả đơn', async () => {
  const { call, sent } = setup({ items: [] });
  const res = await call({ token: 't', order: order({ items: [LINE_UUID] }) });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('item');
  expect(sent('/rest/v1/orders')).toHaveLength(0);
});

test('một món trong đơn đang ẩn thì từ chối cả đơn', async () => {
  const { call, sent } = setup({ items: [{ ...LATTE, available: false }, TRA] });
  const res = await call({ token: 't', order: order({ items: [LINE_UUID, { ...LINE_UUID, menu_item_id: ITEM_ID_2 }] }) });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('item');
  expect(sent('/rest/v1/orders')).toHaveLength(0);
});

test('size M/L không có giá thì từ chối', async () => {
  const { call } = setup();
  const res = await call({ token: 't', order: order({ items: [{ ...LINE_UUID, menu_item_id: ITEM_ID_2, size: 'M' }] }) });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('item');
});

test('đơn không phải uuid được lưu bằng giá khách gửi', async () => {
  const { call, sent } = setup();
  const res = await call({ token: 't', order: order() });
  expect(res.status).toBe(200);
  const [ord] = sent('/rest/v1/orders');
  expect(ord.init.headers.Authorization).toBe('Bearer service-key');
  const header = JSON.parse(ord.init.body);
  expect(header).toMatchObject({ name: 'Nguyễn Văn A', phone: '0986187111', note: 'Ít đá' });
  expect(header.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(JSON.parse(sent('/rest/v1/order_items')[0].init.body)).toEqual([
    { order_id: header.id, menu_item_id: null, item_name: 'Món thử A', size: 'S', unit_price: 45000, quantity: 2 },
  ]);
});

test('nhiều món: lấy tên và giá thật từ cơ sở dữ liệu cho từng dòng, không tin giá phía khách', async () => {
  const { call, sent, calls } = setup();
  const res = await call({
    token: 't',
    order: order({
      items: [
        LINE_UUID,
        { menu_item_id: ITEM_ID, item_name: 'x', unit_price: 1, quantity: 1, size: 'M' },
        { menu_item_id: ITEM_ID_2, item_name: 'y', unit_price: 1, quantity: 3, size: 'S' },
      ],
    }),
  });
  expect(res.status).toBe(200);
  const orderId = JSON.parse(sent('/rest/v1/orders')[0].init.body).id;
  expect(JSON.parse(sent('/rest/v1/order_items')[0].init.body)).toEqual([
    { order_id: orderId, menu_item_id: ITEM_ID, item_name: 'Latte', size: 'S', unit_price: 50000, quantity: 2 },
    { order_id: orderId, menu_item_id: ITEM_ID, item_name: 'Latte', size: 'M', unit_price: 55000, quantity: 1 },
    { order_id: orderId, menu_item_id: ITEM_ID_2, item_name: 'Trà đào', size: 'S', unit_price: 40000, quantity: 3 },
  ]);
  // Chỉ hỏi cơ sở dữ liệu một lần cho các mã món (không trùng lặp)
  const lookups = calls.filter((c) => c.url.includes('/rest/v1/menu_items'));
  expect(lookups).toHaveLength(1);
  expect(lookups[0].url).toContain(`id=in.(${ITEM_ID},${ITEM_ID_2})`);
});

test('lưu món lỗi thì xóa đơn vừa tạo và báo lỗi', async () => {
  const { call, sent } = setup({ itemsInsertStatus: 400 });
  const res = await call({ token: 't', order: order() });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('insert');
  const orderId = JSON.parse(sent('/rest/v1/orders')[0].init.body).id;
  const del = sent(`/rest/v1/orders?id=eq.${orderId}`, 'DELETE');
  expect(del).toHaveLength(1);
});

test('lưu đơn lỗi thì không lưu món', async () => {
  const { call, sent } = setup({ insertStatus: 400 });
  const res = await call({ token: 't', order: order() });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('insert');
  expect(sent('/rest/v1/order_items')).toHaveLength(0);
});

test('ghi chú quá dài bị cắt còn 500 ký tự', async () => {
  const { call, sent } = setup();
  await call({ token: 't', order: order({ note: 'a'.repeat(900) }) });
  expect(JSON.parse(sent('/rest/v1/orders')[0].init.body).note).toHaveLength(500);
});

test('không cấu hình Resend thì không gửi email nhưng vẫn đặt được', async () => {
  const { call, calls } = setup();
  const res = await call({ token: 't', order: order() });
  expect(res.status).toBe(200);
  expect(calls.some((c) => c.url.includes('api.resend.com'))).toBe(false);
});

test('có cấu hình Resend thì gửi email liệt kê các món và tổng tiền', async () => {
  const { call, calls } = setup({ env: { RESEND_API_KEY: 're_abc', NOTIFY_EMAIL: 'chu@quan.test' } });
  const res = await call({
    token: 't',
    order: order({ items: [LINE_UUID, { ...LINE_UUID, menu_item_id: ITEM_ID_2, quantity: 1 }] }),
  });
  expect(res.status).toBe(200);
  const sent = JSON.parse(calls.find((c) => c.url.includes('api.resend.com')).init.body);
  expect(sent.to).toEqual(['chu@quan.test']);
  expect(sent.subject).toContain('Nguyễn Văn A');
  expect(sent.subject).toContain('và 1 món khác');
  expect(sent.html).toContain('Latte size S × 2');
  expect(sent.html).toContain('Trà đào size S × 1');
  expect(sent.html).toContain('140.000đ');
});

test('email thông báo không chèn được mã HTML từ tên khách', async () => {
  const { call, calls } = setup({ env: { RESEND_API_KEY: 're_abc', NOTIFY_EMAIL: 'chu@quan.test' } });
  await call({
    token: 't',
    order: order({ name: '<script>alert(1)</script>', note: '<img src=x onerror=1>', items: [{ ...LINE, item_name: '<b>x</b>' }] }),
  });
  const html = JSON.parse(calls.find((c) => c.url.includes('api.resend.com')).init.body).html;
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('<img');
  expect(html).not.toContain('<b>x');
  expect(html).toContain('&lt;script&gt;');
});

test('gửi email lỗi vẫn không làm hỏng việc đặt món', async () => {
  for (const resendStatus of [500, 'throw']) {
    const { call } = setup({ env: { RESEND_API_KEY: 're_abc', NOTIFY_EMAIL: 'chu@quan.test' }, resendStatus });
    const res = await call({ token: 't', order: order() });
    expect(res.status).toBe(200);
  }
});
