// Kiểm tra hàm "book" (Edge Function) bằng cách chạy chính mã trong prompt3/supabase-function/book.ts
// với Deno, Cloudflare, Supabase và Resend giả.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { test, expect } = require('@playwright/test');

const source = fs.readFileSync(path.join(__dirname, '../prompt3/supabase-function/book.ts'), 'utf8');
const js = esbuild.transformSync(source, { loader: 'ts' }).code;

const GOOD = {
  name: 'Nguyễn Văn A', phone: '0986187111', booking_date: '2031-01-01',
  booking_time: '19:00', guests: 2, table_id: 'B2', note: 'Gần cửa sổ',
};

// Dựng hàm với môi trường giả. Trả về hàm gọi + danh sách các lần gọi ra ngoài.
function setup({ env, turnstileOk = true, tables = [{ seats: 4, name: 'Bàn 2' }], insertStatus = 201, resendStatus = 200 } = {}) {
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (u.includes('challenges.cloudflare.com')) return json(200, { success: turnstileOk });
    if (u.includes('/rest/v1/restaurant_tables')) return json(200, tables);
    if (u.includes('/rest/v1/bookings')) return new Response(null, { status: insertStatus });
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
  const Deno = { serve: (fn) => { handler = fn; }, env: { get: (k) => values[k] } };
  new Function('Deno', 'fetch', js)(Deno, fakeFetch);

  const call = (body, method = 'POST') => handler(new Request('https://x.test/functions/v1/book', {
    method, body: method === 'POST' ? JSON.stringify(body) : undefined,
  }));
  return { call, calls };
}

const bodyOf = (res) => res.json();

test('yêu cầu OPTIONS được trả về kèm quyền CORS', async () => {
  const { call } = setup();
  const res = await call(null, 'OPTIONS');
  expect(res.status).toBe(204);
  expect(res.headers.get('access-control-allow-origin')).toBe('https://jany-ne.github.io');
});

test('không có token captcha thì từ chối và không hỏi Cloudflare', async () => {
  const { call, calls } = setup();
  const res = await call({ booking: GOOD });
  expect(res.status).toBe(400);
  expect((await bodyOf(res)).error).toBe('captcha');
  expect(calls).toHaveLength(0);
});

test('Cloudflare báo token không hợp lệ thì không lưu đơn', async () => {
  const { call, calls } = setup({ turnstileOk: false });
  const res = await call({ token: 't', booking: GOOD });
  expect(res.status).toBe(400);
  expect((await bodyOf(res)).error).toBe('captcha');
  expect(calls.some((c) => c.url.includes('/rest/v1/bookings'))).toBe(false);
});

test('gửi đúng Secret Key và token cho Cloudflare', async () => {
  const { call, calls } = setup();
  await call({ token: 'tok-123', booking: GOOD });
  const params = calls[0].init.body.toString();
  expect(params).toContain('secret=bi-mat');
  expect(params).toContain('response=tok-123');
});

for (const [ten, thayDoi] of [
  ['số điện thoại sai', { phone: '12345' }],
  ['tên trống', { name: '   ' }],
  ['giờ ngoài giờ mở cửa', { booking_time: '23:00' }],
  ['giờ quá sớm', { booking_time: '08:30' }],
  ['số người bằng 0', { guests: 0 }],
  ['số người quá 20', { guests: 21 }],
  ['ngày sai định dạng', { booking_date: '01/01/2031' }],
  ['thiếu mã bàn', { table_id: '' }],
]) {
  test(`dữ liệu không hợp lệ (${ten}) bị từ chối`, async () => {
    const { call, calls } = setup();
    const res = await call({ token: 't', booking: { ...GOOD, ...thayDoi } });
    expect(res.status).toBe(400);
    expect((await bodyOf(res)).error).toBe('invalid');
    expect(calls.some((c) => c.url.includes('/rest/v1/bookings'))).toBe(false);
  });
}

test('bàn không tồn tại thì từ chối', async () => {
  const { call } = setup({ tables: [] });
  const res = await call({ token: 't', booking: GOOD });
  expect(res.status).toBe(400);
  expect((await bodyOf(res)).error).toBe('table');
});

test('bàn không đủ chỗ cho số người thì từ chối', async () => {
  const { call } = setup({ tables: [{ seats: 2, name: 'Bàn 2' }] });
  const res = await call({ token: 't', booking: { ...GOOD, guests: 3 } });
  expect(res.status).toBe(400);
  expect((await bodyOf(res)).error).toBe('table');
});

test('đặt bàn hợp lệ được lưu bằng quyền service và trả 200', async () => {
  const { call, calls } = setup();
  const res = await call({ token: 't', booking: GOOD });
  expect(res.status).toBe(200);
  const insert = calls.find((c) => c.url.endsWith('/rest/v1/bookings'));
  expect(insert.init.headers.Authorization).toBe('Bearer service-key');
  expect(JSON.parse(insert.init.body)).toEqual({
    name: 'Nguyễn Văn A', phone: '0986187111', booking_date: '2031-01-01', booking_time: '19:00', guests: 2, table_id: 'B2', note: 'Gần cửa sổ',
  });
});

test('trùng giờ cùng bàn (cơ sở dữ liệu trả 409) thì trả 409', async () => {
  const { call } = setup({ insertStatus: 409 });
  const res = await call({ token: 't', booking: GOOD });
  expect(res.status).toBe(409);
  expect((await bodyOf(res)).error).toBe('conflict');
});

test('ghi chú quá dài bị cắt còn 500 ký tự', async () => {
  const { call, calls } = setup();
  await call({ token: 't', booking: { ...GOOD, note: 'a'.repeat(900) } });
  const insert = calls.find((c) => c.url.endsWith('/rest/v1/bookings'));
  expect(JSON.parse(insert.init.body).note).toHaveLength(500);
});

test('không cấu hình Resend thì không gửi email nhưng vẫn đặt được', async () => {
  const { call, calls } = setup();
  const res = await call({ token: 't', booking: GOOD });
  expect(res.status).toBe(200);
  expect(calls.some((c) => c.url.includes('api.resend.com'))).toBe(false);
});

test('có cấu hình Resend thì gửi email thông báo cho chủ quán', async () => {
  const { call, calls } = setup({ env: { RESEND_API_KEY: 're_abc', NOTIFY_EMAIL: 'chu@quan.test' } });
  const res = await call({ token: 't', booking: GOOD });
  expect(res.status).toBe(200);
  const mail = calls.find((c) => c.url.includes('api.resend.com'));
  expect(mail.init.headers.Authorization).toBe('Bearer re_abc');
  const sent = JSON.parse(mail.init.body);
  expect(sent.to).toEqual(['chu@quan.test']);
  expect(sent.subject).toContain('Nguyễn Văn A');
  expect(sent.html).toContain('01/01/2031');
  expect(sent.html).toContain('Bàn 2');
});

test('email thông báo không chèn được mã HTML từ tên khách', async () => {
  const { call, calls } = setup({ env: { RESEND_API_KEY: 're_abc', NOTIFY_EMAIL: 'chu@quan.test' } });
  await call({ token: 't', booking: { ...GOOD, name: '<script>alert(1)</script>', note: '<img src=x onerror=1>' } });
  const html = JSON.parse(calls.find((c) => c.url.includes('api.resend.com')).init.body).html;
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('<img');
  expect(html).toContain('&lt;script&gt;');
});

test('gửi email lỗi (Resend báo lỗi hoặc mất mạng) vẫn không làm hỏng việc đặt bàn', async () => {
  for (const resendStatus of [500, 'throw']) {
    const { call } = setup({ env: { RESEND_API_KEY: 're_abc', NOTIFY_EMAIL: 'chu@quan.test' }, resendStatus });
    const res = await call({ token: 't', booking: GOOD });
    expect(res.status).toBe(200);
  }
});
