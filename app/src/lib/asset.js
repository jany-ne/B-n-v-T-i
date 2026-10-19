// Đường dẫn tới ảnh nằm trong thư mục public của ứng dụng.
// Ảnh cũ trong cơ sở dữ liệu lưu dạng "images/x.jpg" (tương đối); ảnh mới tải lên là địa chỉ https đầy đủ.
// Ghép thêm thư mục gốc của trang để địa chỉ đúng ở mọi trang (kể cả /dat-ban, /quan-ly).
export const asset = (u) => (!u || /^(https?:|data:|\/)/.test(u) ? u : import.meta.env.BASE_URL + u);
