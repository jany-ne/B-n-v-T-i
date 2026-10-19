// Supabase Edge Function "chat": chatbot hỏi đáp về quán.
// BẢN CHẠY THỬ: trả lời bằng quy tắc có sẵn, CHƯA gọi Claude, nên không tốn phí.
// Tạo trong Supabase: Edge Functions > Deploy a new function > Via Editor, đặt tên "chat", dán file này,
// rồi tắt công tắc "Verify JWT" của function (giống function "book").
// SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY được Supabase tự cấp, không cần thêm secret.
//
// Khi muốn dùng Claude thật: thay hàm answer() bằng một hàm gọi API Claude, với khóa
// ANTHROPIC_API_KEY lưu trong Edge Functions > Secrets (tuyệt đối không đặt trong code).

const ALLOWED_ORIGIN = 'https://jany-ne.github.io';

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

const SHOP = {
  hours: 'Quán mở cửa 9:00 - 22:00 hằng ngày.',
  address: 'Quán ở Hẻm 290 Đường Dương Bá Trạc, Phường Chánh Hưng, TP.HCM.',
  phone: '0986 187 111',
  zalo: '0986 187 186',
};

type Item = { name: string; description: string | null; price: number };

// Bỏ dấu tiếng Việt và viết thường để so khớp từ khóa dễ hơn.
function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
}

function money(n: number) {
  return Number(n).toLocaleString('vi-VN') + 'đ';
}

function has(q: string, words: string[]) {
  return words.some((w) => q.includes(w));
}

// Món nào có nhiều từ trong tên xuất hiện trong câu hỏi nhất thì được chọn.
function matchItems(q: string, items: Item[]) {
  const scored = items.map((it) => {
    const words = norm(it.name).split(/\s+/).filter((w) => w.length >= 3);
    const hit = words.filter((w) => q.includes(w)).length;
    return { it, hit, need: Math.max(1, Math.ceil(words.length / 2)) };
  }).filter((s) => s.hit >= s.need);
  const best = Math.max(0, ...scored.map((s) => s.hit));
  return scored.filter((s) => s.hit === best).map((s) => s.it).slice(0, 3);
}

function answer(question: string, items: Item[]): string {
  const q = norm(question);

  if (has(q, ['gio mo', 'mo cua', 'dong cua', 'may gio', 'gio lam viec'])) return SHOP.hours;
  if (has(q, ['dia chi', 'o dau', 'duong nao', 'cho nao', 'tim quan'])) return SHOP.address;
  if (has(q, ['so dien thoai', 'dien thoai', 'goi', 'lien he', 'hotline', 'zalo'])) {
    return `Bạn gọi quán theo số ${SHOP.phone}, hoặc nhắn Zalo ${SHOP.zalo} nhé.`;
  }
  if (has(q, ['dat ban', 'giu cho', 'book', 'dat cho'])) {
    return 'Bạn vào trang Đặt bàn trên menu, chọn ngày, giờ, số người và bàn còn trống. Quán sẽ liên hệ xác nhận qua số điện thoại của bạn.';
  }

  const found = matchItems(q, items);
  if (found.length) {
    return found.map((it) => `${it.name}: ${money(it.price)}${it.description ? '. ' + it.description : ''}`).join('\n');
  }

  if (has(q, ['menu', 'co gi', 'do uong', 'thuc don', 'uong gi', 'mon nao'])) {
    if (!items.length) return 'Hiện mình chưa tải được menu, bạn xem phần Menu trên trang nhé.';
    return 'Menu hiện có:\n' + items.map((it) => `- ${it.name}: ${money(it.price)}`).join('\n');
  }
  if (has(q, ['gia', 'bao nhieu', 'tien'])) {
    return 'Bạn cho mình biết tên món, ví dụ "giá cà phê sữa", hoặc hỏi "menu có gì" để xem toàn bộ nhé.';
  }
  if (has(q, ['xin chao', 'chao', 'hello', 'hi ', 'alo'])) return 'Chào bạn! Mình có thể giúp gì về menu, giờ mở cửa, địa chỉ hay đặt bàn?';
  if (has(q, ['cam on', 'thanks', 'cảm ơn'])) return 'Không có gì ạ! Hẹn gặp bạn tại quán.';

  return `Mình chưa hiểu câu hỏi này. Bạn thử hỏi về menu, giá, giờ mở cửa, địa chỉ hay đặt bàn nhé, hoặc gọi quán theo số ${SHOP.phone}.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'method' });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return reply(400, { error: 'json' });
  }
  const question = String(payload?.message ?? '').trim();
  if (!question || question.length > 300) return reply(400, { error: 'invalid' });

  let items: Item[] = [];
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const res = await fetch(`${url}/rest/v1/menu_items?select=name,description,price&available=eq.true&order=sort.asc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (res.ok) items = await res.json();
  } catch {
    // không có menu thì vẫn trả lời được các câu khác
  }

  return reply(200, { reply: answer(question, items), mode: 'mock' });
});
