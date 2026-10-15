-- Chạy file này trong Supabase: SQL Editor > New query > dán > Run.
-- Trước khi chạy, thay ADMIN_EMAIL ở cuối file bằng email tài khoản quản lý của bạn.

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 1 and 100),
  phone        text not null check (phone ~ '^(0|\+84)[0-9]{9}$'),
  booking_date date not null check (booking_date >= current_date),
  booking_time time not null check (booking_time between '09:00' and '21:30'),
  guests       int  not null check (guests between 1 and 20),
  note         text check (char_length(note) <= 500)
);

alter table public.bookings enable row level security;

-- Khách (chưa đăng nhập) chỉ được THÊM đơn, không đọc, sửa, xóa được gì.
drop policy if exists "Khach duoc dat ban" on public.bookings;
create policy "Khach duoc dat ban"
  on public.bookings for insert
  to anon
  with check (true);

-- Chỉ tài khoản quản lý mới được xem và xóa đơn.
drop policy if exists "Quan ly xem don" on public.bookings;
create policy "Quan ly xem don"
  on public.bookings for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'jany@cybridge.jp');

drop policy if exists "Quan ly xoa don" on public.bookings;
create policy "Quan ly xoa don"
  on public.bookings for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'jany@cybridge.jp');
