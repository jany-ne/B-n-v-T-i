// Khung xương: khối xám nhấp nháy giữ chỗ cho nội dung đang tải, để trang không bị giật khi dữ liệu về.
// aria-hidden vì đây chỉ là trang trí; người dùng trình đọc màn hình nghe thông báo "Đang tải..." riêng.
export default function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-bg-alt ${className}`} />;
}
