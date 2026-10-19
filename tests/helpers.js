// Các hàm dùng chung cho mọi bài test.

const SUPABASE = 'https://favkwkfugnrpwmecpjka.supabase.co';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

// Giả lập một địa chỉ Supabase để test không đụng vào dữ liệu thật.
// reply(request) trả về { status, body } hoặc undefined để dùng mặc định 200 + [].
async function mockSupabase(page, pattern, reply) {
  await page.route(SUPABASE + pattern, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS });
    }
    const r = (reply && reply(request)) || { status: 200, body: [] };
    return route.fulfill({
      status: r.status,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify(r.body),
    });
  });
}

// Thay Turnstile bằng bản giả luôn "xác minh thành công".
async function mockTurnstile(page) {
  await page.route('https://challenges.cloudflare.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    window.turnstile = {
      render: (selector, options) => { setTimeout(() => options.callback('token-gia'), 0); return 'widget-1'; },
      reset: () => {},
    };
  });
}

// Ngày trong tương lai (YYYY-MM-DD) để form chấp nhận.
function futureDate(days = 7) {
  const d = new Date(Date.now() + days * 86400000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const TABLES = [
  { id: 'B1', name: 'Bàn 1', seats: 2 },
  { id: 'B2', name: 'Bàn 2', seats: 2 },
  { id: 'B5', name: 'Bàn 5', seats: 4 },
];

module.exports = { mockSupabase, mockTurnstile, futureDate, TABLES };
