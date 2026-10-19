// Supabase Edge Function "contact": kiểm tra Turnstile rồi gửi lời nhắn của khách tới email chủ quán.
// Thay cho Formspree trên form liên hệ, để có thể chặn bot ở phía máy chủ.
// Tạo trong Supabase: Edge Functions > Deploy a new function > Via Editor, đặt tên "contact", dán file này,
// rồi tắt công tắc "Verify JWT" của function (giống function "book").
// Dùng chung các secret đã có: TURNSTILE_SECRET_KEY, RESEND_API_KEY, NOTIFY_EMAIL. Không cần thêm secret mới.

// Chỉ các trang này được phép gọi hàm. localhost:5173 là địa chỉ khi bạn chạy "npm run dev" trên máy.
const ALLOWED_ORIGINS = ['https://jany-ne.github.io', 'http://localhost:5173'];

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function reply(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function esc(v: unknown) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
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
  const f = payload?.contact ?? {};
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

  // 2. Kiểm tra dữ liệu
  const name = String(f.name ?? '').trim();
  const email = String(f.email ?? '').trim();
  const phone = String(f.phone ?? '').replace(/[\s.\-()]/g, '');
  const message = String(f.message ?? '').trim();

  const valid =
    name.length >= 1 && name.length <= 100 &&
    email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    /^(0|\+84)[0-9]{9}$/.test(phone) &&
    message.length >= 10 && message.length <= 2000;
  if (!valid) return reply(req, 400, { error: 'invalid' });

  // 3. Gửi email cho chủ quán. Ở đây email chính là nơi lưu lời nhắn nên gửi lỗi phải báo lỗi.
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('NOTIFY_EMAIL');
  if (!apiKey || !to) return reply(req, 500, { error: 'config' });

  let sent: Response;
  try {
    sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ban va Toi <onboarding@resend.dev>',
        to: [to],
        reply_to: email,
        subject: `Lời nhắn mới từ ${name.slice(0, 50)}`,
        html: `<h2>Có lời nhắn mới từ form liên hệ</h2>
<p><b>Họ tên:</b> ${esc(name)}<br>
<b>Email:</b> ${esc(email)}<br>
<b>Điện thoại:</b> ${esc(phone)}</p>
<p><b>Lời nhắn:</b><br>${esc(message).replace(/\n/g, '<br>')}</p>`,
      }),
    });
  } catch {
    return reply(req, 502, { error: 'send' });
  }
  if (!sent.ok) return reply(req, 502, { error: 'send' });
  return reply(req, 200, { ok: true });
});
