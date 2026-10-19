// Menu dự phòng, dùng khi chưa tải được dữ liệu từ Supabase.
export const FALLBACK_MENU = [
  { id: 1, name: 'Cà phê sữa', description: 'Đậm đà, béo nhẹ.', price: 35000, image_url: 'images/ca-phe-sua.jpg', alt_text: 'Ly cà phê sữa nóng có lớp bọt mịn' },
  { id: 2, name: 'Bạc xỉu', description: 'Nhiều sữa, ít cà phê.', price: 35000, image_url: 'images/bac-xiu.jpg', alt_text: 'Ly bạc xỉu đá với sữa hòa quyện cà phê' },
  { id: 3, name: 'Cold brew', description: 'Ủ lạnh 18 tiếng.', price: 45000, image_url: 'images/cold-brew.jpg', alt_text: 'Ly cold brew đá rót cà phê lên lớp sữa' },
  { id: 4, name: 'Latte', description: 'Espresso và sữa tươi.', price: 50000, image_url: 'images/latte.jpg', alt_text: 'Ly latte với họa tiết lá vẽ bằng sữa' },
  { id: 5, name: 'Cappuccino', description: 'Bọt sữa mịn.', price: 50000, image_url: 'images/cappuccino.jpg', alt_text: 'Tách cappuccino rắc bột quế' },
  { id: 6, name: 'Trà đào', description: 'Thanh mát, thơm nhẹ.', price: 40000, image_url: 'images/tra-dao.jpg', alt_text: 'Ly trà đào với lát đào và lá bạc hà' },
];

export const money = (n) => Number(n).toLocaleString('vi-VN') + 'đ';
