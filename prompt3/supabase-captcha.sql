-- Chạy SAU KHI đã tạo Edge Function "book" và thử đặt bàn thành công.
-- Từ giờ khách chỉ đặt bàn được qua Edge Function (có Turnstile),
-- không còn gửi thẳng vào bảng bookings được nữa.

drop policy if exists "Khach duoc dat ban" on public.bookings;
