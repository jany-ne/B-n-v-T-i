// Kiểm tra hàm "contact" bằng cách chạy chính mã trong prompt3/supabase-function/contact.ts với dịch vụ giả.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { test, expect } = require('@playwright/test');

const js = esbuild.transformSync(fs.readFileSync(path.join(__dirname, '../prompt3/supabase-function/contact.ts'), 'utf8'), { loader: 'ts' }).code;

const GOOD = { name: 'Nguyễn Văn A', email: 'khach@example.com', phone: '0986 187 111', message: 'Quán có nhận đặt tiệc không ạ?' };

function setup({ env, turnstileOk = true, resend = 200 } = {}) {
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u.includes('challenges.cloudflare.com')) return new Response(JSON.stringify({ success: turnstileOk }), { status: 200 });
    if (u.includes('api.resend.com')) {
      if (resend === 'throw') throw new Error('mạng lỗi');
      return new Response('{}', { status: resend });
    }
    return new Response('{}', { status: 404 });
  };
  let handler;
  const values = { TURNSTILE_SECRET_KEY: 'bi-mat', RESEND_API_KEY: 're_abc', NOTIFY_EMAIL: 'chu@quan.test', ...env };
  new Function('Deno', 'fetch', js)({ serve: (fn) => { handler = fn; }, env: { get: (k) => values[k] } }, fakeFetch);
  const call = (body, method = 'POST') => handler(new Request('https://x.test/functions/v1/contact', { method, body: method === 'POST' ? JSON.stringify(body) : undefined }));
  return { call, calls };
}

test('OPTIONS trả về quyền CORS', async () => {
  const res = await setup().call(null, 'OPTIONS');
  expect(res.status).toBe(204);
  expect(res.headers.get('access-control-allow-origin')).toBe('https://jany-ne.github.io');
});

test('không có token thì từ chối, không hỏi Cloudflare, không gửi mail', async () => {
  const { call, calls } = setup();
  const res = await call({ contact: GOOD });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBe('captcha');
  expect(calls).toHaveLength(0);
});

test('Cloudflare báo token sai thì không gửi mail', async () => {
  const { call, calls } = setup({ turnstileOk: false });
  const res = await call({ token: 't', contact: GOOD });
  expect(res.status).toBe(400);
  expect(calls.some((c) => c.url.includes('resend'))).toBe(false);
});

for (const [ten, doi] of [
  ['tên trống', { name: ' ' }],
  ['email sai', { email: 'khong-phai-email' }],
  ['số điện thoại sai', { phone: '123' }],
  ['lời nhắn quá ngắn', { message: 'ngắn' }],
  ['lời nhắn quá dài', { message: 'a'.repeat(2001) }],
]) {
  test(`dữ liệu không hợp lệ (${ten}) bị từ chối`, async () => {
    const { call, calls } = setup();
    const res = await call({ token: 't', contact: { ...GOOD, ...doi } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid');
    expect(calls.some((c) => c.url.includes('resend'))).toBe(false);
  });
}

test('lời nhắn hợp lệ được gửi mail cho chủ quán, bấm trả lời sẽ tới khách', async () => {
  const { call, calls } = setup();
  const res = await call({ token: 't', contact: GOOD });
  expect(res.status).toBe(200);
  const mail = calls.find((c) => c.url.includes('api.resend.com'));
  expect(mail.init.headers.Authorization).toBe('Bearer re_abc');
  const sent = JSON.parse(mail.init.body);
  expect(sent.to).toEqual(['chu@quan.test']);
  expect(sent.reply_to).toBe('khach@example.com');
  expect(sent.html).toContain('0986187111');
  expect(sent.html).toContain('Quán có nhận đặt tiệc không ạ?');
});

test('mail không chèn được mã HTML từ lời nhắn', async () => {
  const { call, calls } = setup();
  await call({ token: 't', contact: { ...GOOD, name: '<b>x</b>', message: '<script>alert(1)</script> ít nhất mười ký tự' } });
  const html = JSON.parse(calls.find((c) => c.url.includes('resend')).init.body).html;
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('<b>x</b>');
});

test('thiếu cấu hình Resend thì báo lỗi 500 (không được giả vờ thành công)', async () => {
  const res = await setup({ env: { RESEND_API_KEY: '' } }).call({ token: 't', contact: GOOD });
  expect(res.status).toBe(500);
});

test('Resend báo lỗi hoặc mất mạng thì báo lỗi 502', async () => {
  for (const resend of [500, 'throw']) {
    const res = await setup({ resend }).call({ token: 't', contact: GOOD });
    expect(res.status).toBe(502);
  }
});
