// Supabase Edge Function "order": kiểm tra Turnstile rồi mới lưu đơn mua món.
// Tạo trong Supabase: Edge Functions > Deploy a new function > Via Editor, đặt tên "order", dán file này,
// rồi tắt công tắc "Verify JWT" của function (giống function "book").
// Dùng chung các secret đã có: TURNSTILE_SECRET_KEY, RESEND_API_KEY, NOTIFY_EMAIL.
// SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY được Supabase tự cấp, không cần thêm.
// Cần chạy prompt3/supabase-orders.sql (và supabase-menu-sizes.sql nếu bảng đã có sẵn) trước khi hàm này lưu được đơn.

// Chỉ các trang này được phép gọi hàm. localhost:5173 là địa chỉ khi bạn chạy "npm run dev" trên máy.
const ALLOWED_ORIGINS = ['https://jany-ne.github.io', 'http://localhost:5173'];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function esc(v: unknown) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function reply(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function money(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

function priceForSize(row: { price?: unknown; price_m?: unknown; price_l?: unknown }, size: string) {
  const raw = size === 'M' ? row.price_m : size === 'L' ? row.price_l : row.price;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

// Gửi email báo có đơn mới. Lỗi ở bước này không làm hỏng việc đặt món.
async function notifyOwner(d: Record<string, unknown>) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('NOTIFY_EMAIL');
  if (!apiKey || !to) return;
  const html = `<h2>Có đơn mua món mới</h2>
<p><b>Họ tên:</b> ${esc(d.name)}<br>
<b>Điện thoại:</b> ${esc(d.phone)}<br>
<b>Món:</b> ${esc(d.itemName)} size ${esc(d.size)} × ${esc(d.quantity)}<br>
<b>Tạm tính:</b> ${esc(d.total)}<br>
<b>Ghi chú:</b> ${esc(d.note || '(không có)')}</p>
<p>Nhận tại quán, thanh toán khi lấy.</p>`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ban va Toi <onboarding@resend.dev>',
        to: [to],
        subject: `Đơn món mới: ${String(d.name).slice(0, 50)} - ${String(d.itemName).slice(0, 40)}`,
        html,
      }),
    });
  } catch {
    // bỏ qua
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return reply(req, 405, { error: 'method' });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return reply(req, 400, { error: 'json' });
  }
  const token = String(payload?.token ?? '');
  const o = payload?.order ?? {};
  if (!token) return reply(req, 400, { error: 'captcha' });

  // 1. Kiểm tra Turnstile với Cloudflare
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: Deno.env.get('TURNSTILE_SECRET_KEY') ?? '',
      response: token,
    }),
  });
  const result = await verify.json();
  if (!result.success) return reply(req, 400, { error: 'captcha' });

  // 2. Kiểm tra dữ liệu đơn
  const name = String(o.name ?? '').trim();
  const phone = String(o.phone ?? '');
  const quantity = Number(o.quantity);
  const note = o.note == null ? null : String(o.note).trim().slice(0, 500) || null;
  const rawId = String(o.menu_item_id ?? '');
  let itemName = String(o.item_name ?? '').trim();
  let unitPrice = Number(o.unit_price);
  let menuItemId: string | null = UUID.test(rawId) ? rawId : null;
  const size = String(o.size ?? 'S').toUpperCase();

  const validShape =
    name.length >= 1 && name.length <= 100 &&
    /^(0|\+84)[0-9]{9}$/.test(phone) &&
    Number.isInteger(quantity) && quantity >= 1 && quantity <= 20 &&
    (size === 'S' || size === 'M' || size === 'L');
  if (!validShape) return reply(req, 400, { error: 'invalid' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  // 3. Nếu có mã món từ cơ sở dữ liệu thì lấy tên và giá thật theo size, không tin giá phía khách.
  if (menuItemId) {
    const t = await fetch(`${url}/rest/v1/menu_items?id=eq.${encodeURIComponent(menuItemId)}&select=name,price,price_m,price_l,available`, { headers });
    const rows = await t.json();
    if (!Array.isArray(rows) || rows.length === 0 || !rows[0].available) {
      return reply(req, 400, { error: 'item' });
    }
    const priced = priceForSize(rows[0], size);
    if (priced == null) return reply(req, 400, { error: 'item' });
    itemName = String(rows[0].name);
    unitPrice = priced;
  } else if (
    itemName.length < 1 || itemName.length > 100 ||
    !Number.isInteger(unitPrice) || unitPrice < 0 || unitPrice > 10000000
  ) {
    return reply(req, 400, { error: 'invalid' });
  }

  // 4. Lưu đơn.
  const ins = await fetch(`${url}/rest/v1/orders`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      name, phone, menu_item_id: menuItemId, item_name: itemName, unit_price: unitPrice, quantity, size, note,
    }),
  });
  if (!ins.ok) return reply(req, 400, { error: 'insert' });
  await notifyOwner({ name, phone, itemName, quantity, size, note, total: money(unitPrice * quantity) });
  return reply(req, 200, { ok: true });
});
