// Menu dự phòng, dùng khi chưa tải được dữ liệu từ Supabase.
// price = size S; price_m / price_l để trống (null) nếu món không bán size đó.
export const FALLBACK_MENU = [
  { id: 1, name: 'Cà phê sữa', description: 'Đậm đà, béo nhẹ.', price: 35000, price_m: 40000, price_l: 45000, image_url: 'images/ca-phe-sua.jpg', alt_text: 'Ly cà phê sữa nóng có lớp bọt mịn' },
  { id: 2, name: 'Bạc xỉu', description: 'Nhiều sữa, ít cà phê.', price: 35000, price_m: 40000, price_l: 45000, image_url: 'images/bac-xiu.jpg', alt_text: 'Ly bạc xỉu đá với sữa hòa quyện cà phê' },
  { id: 3, name: 'Cold brew', description: 'Ủ lạnh 18 tiếng.', price: 45000, price_m: 50000, price_l: 55000, image_url: 'images/cold-brew.jpg', alt_text: 'Ly cold brew đá rót cà phê lên lớp sữa' },
  { id: 4, name: 'Latte', description: 'Espresso và sữa tươi.', price: 50000, price_m: 55000, price_l: 60000, image_url: 'images/latte.jpg', alt_text: 'Ly latte với họa tiết lá vẽ bằng sữa' },
  { id: 5, name: 'Cappuccino', description: 'Bọt sữa mịn.', price: 50000, price_m: 55000, price_l: 60000, image_url: 'images/cappuccino.jpg', alt_text: 'Tách cappuccino rắc bột quế' },
  { id: 6, name: 'Trà đào', description: 'Thanh mát, thơm nhẹ.', price: 40000, price_m: 45000, price_l: 50000, image_url: 'images/tra-dao.jpg', alt_text: 'Ly trà đào với lát đào và lá bạc hà' },
];

export const money = (n) => Number(n).toLocaleString('vi-VN') + 'đ';

function hasPrice(v) {
  return v != null && v !== '';
}

export function priceOf(item, size = 'S') {
  if (size === 'M') return hasPrice(item.price_m) ? Number(item.price_m) : null;
  if (size === 'L') return hasPrice(item.price_l) ? Number(item.price_l) : null;
  return Number(item.price);
}

export function availableSizes(item) {
  const sizes = [{ size: 'S', price: Number(item.price) }];
  if (hasPrice(item.price_m)) sizes.push({ size: 'M', price: Number(item.price_m) });
  if (hasPrice(item.price_l)) sizes.push({ size: 'L', price: Number(item.price_l) });
  return sizes;
}

export function formatPrices(item) {
  const sizes = availableSizes(item);
  if (sizes.length === 1) return money(sizes[0].price);
  return sizes.map((s) => `${s.size} ${money(s.price)}`).join(' · ');
}
