// Supabase Edge Function "order": kiểm tra Turnstile rồi mới lưu đơn mua món.
// Tạo trong Supabase: Edge Functions > Deploy a new function > Via Editor, đặt tên "order", dán file này,
// rồi tắt công tắc "Verify JWT" của function (giống function "book").
// Dùng chung các secret đã có: TURNSTILE_SECRET_KEY, RESEND_API_KEY, NOTIFY_EMAIL.
// SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY được Supabase tự cấp, không cần thêm.
// Cần chạy prompt3/supabase-orders.sql (bảng orders + order_items) và supabase-menu-sizes.sql trước khi hàm này lưu được đơn.
// Một đơn có nhiều món: payload { token, order: { name, phone, note, items: [{ menu_item_id, item_name, unit_price, size, quantity }] } }.

// Chỉ các trang này được phép gọi hàm. localhost:5173 là địa chỉ khi bạn chạy "npm run dev" trên máy.
const ALLOWED_ORIGINS = ['https://jany-ne.github.io', 'http://localhost:5173'];

const MAX_LINES = 20; // tối đa 20 dòng món mỗi đơn

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

type Line = { menuItemId: string | null; itemName: string; size: string; unitPrice: number; quantity: number };

// Gửi email báo có đơn mới. Lỗi ở bước này không làm hỏng việc đặt món.
async function notifyOwner(d: { name: string; phone: string; note: string | null; lines: Line[]; total: number }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('NOTIFY_EMAIL');
  if (!apiKey || !to) return;
  const list = d.lines
    .map((l) => `<li>${esc(l.itemName)} size ${esc(l.size)} × ${esc(l.quantity)} = ${esc(money(l.unitPrice * l.quantity))}</li>`)
    .join('');
  const html = `<h2>Có đơn mua món mới</h2>
<p><b>Họ tên:</b> ${esc(d.name)}<br>
<b>Điện thoại:</b> ${esc(d.phone)}</p>
<ul>${list}</ul>
<p><b>Tổng:</b> ${esc(money(d.total))}<br>
<b>Ghi chú:</b> ${esc(d.note || '(không có)')}</p>
<p>Nhận tại quán, thanh toán khi lấy.</p>`;
  const first = d.lines[0].itemName.slice(0, 40);
  const more = d.lines.length > 1 ? ` và ${d.lines.length - 1} món khác` : '';
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ban va Toi <onboarding@resend.dev>',
        to: [to],
        subject: `Đơn món mới: ${d.name.slice(0, 50)} - ${first}${more}`,
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
  const note = o.note == null ? null : String(o.note).trim().slice(0, 500) || null;
  const rawItems: any[] = Array.isArray(o.items) ? o.items : [];

  if (
    name.length < 1 || name.length > 100 ||
    !/^(0|\+84)[0-9]{9}$/.test(phone) ||
    rawItems.length < 1 || rawItems.length > MAX_LINES
  ) {
    return reply(req, 400, { error: 'invalid' });
  }

  const wanted = rawItems.map((it) => {
    const rawId = String(it?.menu_item_id ?? '');
    return {
      menuItemId: UUID.test(rawId) ? rawId.toLowerCase() : null,
      itemName: String(it?.item_name ?? '').trim(),
      unitPrice: Number(it?.unit_price),
      size: String(it?.size ?? 'S').toUpperCase(),
      quantity: Number(it?.quantity),
    };
  });
  const validShape = wanted.every((w) =>
    Number.isInteger(w.quantity) && w.quantity >= 1 && w.quantity <= 20 &&
    (w.size === 'S' || w.size === 'M' || w.size === 'L'));
  if (!validShape) return reply(req, 400, { error: 'invalid' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  // 3. Món có mã từ cơ sở dữ liệu thì lấy tên và giá thật theo size, không tin giá phía khách.
  const ids = [...new Set(wanted.map((w) => w.menuItemId).filter((id): id is string => id !== null))];
  const menu = new Map<string, any>();
  if (ids.length) {
    const t = await fetch(`${url}/rest/v1/menu_items?id=in.(${ids.join(',')})&select=id,name,price,price_m,price_l,available`, { headers });
    const rows = await t.json();
    if (Array.isArray(rows)) for (const r of rows) menu.set(String(r.id).toLowerCase(), r);
  }

  const lines: Line[] = [];
  for (const w of wanted) {
    if (w.menuItemId) {
      const row = menu.get(w.menuItemId);
      if (!row || !row.available) return reply(req, 400, { error: 'item' });
      const priced = priceForSize(row, w.size);
      if (priced == null) return reply(req, 400, { error: 'item' });
      lines.push({ menuItemId: w.menuItemId, itemName: String(row.name), size: w.size, unitPrice: priced, quantity: w.quantity });
    } else if (
      w.itemName.length < 1 || w.itemName.length > 100 ||
      !Number.isInteger(w.unitPrice) || w.unitPrice < 0 || w.unitPrice > 10000000
    ) {
      return reply(req, 400, { error: 'invalid' });
    } else {
      lines.push({ menuItemId: null, itemName: w.itemName, size: w.size, unitPrice: w.unitPrice, quantity: w.quantity });
    }
  }

  // 4. Lưu đơn rồi lưu các món. Nếu lưu món lỗi thì xóa đơn vừa tạo để không để lại đơn rỗng.
  const orderId = crypto.randomUUID();
  const ins = await fetch(`${url}/rest/v1/orders`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ id: orderId, name, phone, note }),
  });
  if (!ins.ok) return reply(req, 400, { error: 'insert' });

  const insItems = await fetch(`${url}/rest/v1/order_items`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(lines.map((l) => ({
      order_id: orderId, menu_item_id: l.menuItemId, item_name: l.itemName, size: l.size, unit_price: l.unitPrice, quantity: l.quantity,
    }))),
  });
  if (!insItems.ok) {
    await fetch(`${url}/rest/v1/orders?id=eq.${orderId}`, { method: 'DELETE', headers });
    return reply(req, 400, { error: 'insert' });
  }

  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  await notifyOwner({ name, phone, note, lines, total });
  return reply(req, 200, { ok: true });
});
