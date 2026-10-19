// Thông tin của quán để ở MỘT chỗ. Header, Footer, Contact cùng đọc từ đây,
// nên khi đổi số điện thoại hay địa chỉ bạn chỉ sửa một nơi.
export const SITE = {
  name: 'Bạn & Tôi',
  address: '290 Đường Dương Bá Trạc, Phường Chánh Hưng, TP.HCM',
  hours: 'Mở cửa 9:00 - 22:00 hằng ngày',
  phone: { display: '0986 187 111', tel: '0986187111' },
  facebook: 'https://www.facebook.com/kim.chi.712539',
  zalo: { display: '0986 187 186', url: 'https://zalo.me/0986187186' },
};

// Các liên kết điều hướng chính (menu trên cùng và chân trang).
// - "section": cuộn tới một phần của trang chủ
// - "to": chuyển sang một trang khác
export const NAV = [
  { label: 'Trang chủ', section: 'hero' },
  { label: 'Menu', section: 'menu' },
  { label: 'Đặt bàn', to: '/dat-ban' },
  { label: 'Đánh giá', section: 'danh-gia' },
  { label: 'Liên hệ', section: 'lien-he' },
];
