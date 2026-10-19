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
    let options;
    const issue = () => setTimeout(() => options.callback('token-gia'), 0);
    window.turnstile = {
      render: (selector, opts) => { options = opts; issue(); return 'widget-1'; },
      reset: () => issue(), // Turnstile thật cấp token mới sau khi reset
      remove: () => {},
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

// Tạo ảnh PNG thật (màu đơn sắc) để thử upload, không phụ thuộc file bên ngoài.
function makePng(width = 40, height = 50) {
  const zlib = require('zlib');
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8 bit, màu RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x80)]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

module.exports = { mockSupabase, mockTurnstile, futureDate, makePng, TABLES };
