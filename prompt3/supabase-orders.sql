-- Đơn mua món (nút Mua ngay). Chạy trong Supabase: SQL Editor > New query > dán > Run.
-- Trước khi chạy, thay ADMIN_EMAIL (2 chỗ, dùng Tìm và Thay thế tất cả) bằng email tài khoản quản lý của bạn.
-- Đừng commit bản đã điền email thật lên GitHub.
-- Cần có bảng menu_items (đã chạy supabase-menu.sql) trước file này.

create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 1 and 100),
  phone        text not null check (phone ~ '^(0|\+84)[0-9]{9}$'),
  menu_item_id uuid references public.menu_items(id),
  item_name    text not null check (char_length(item_name) between 1 and 100),
  unit_price   int  not null check (unit_price >= 0),
  quantity     int  not null check (quantity between 1 and 20),
  size         text not null default 'S' check (size in ('S', 'M', 'L')),
  note         text check (char_length(note) <= 500),
  status       text not null default 'new' check (status in ('new', 'done', 'cancelled'))
);

alter table public.orders enable row level security;

-- Khách không ghi thẳng vào bảng; chỉ Edge Function (service role) được thêm đơn.

drop policy if exists "Quan ly xem don mon" on public.orders;
create policy "Quan ly xem don mon"
  on public.orders for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

drop policy if exists "Quan ly xoa don mon" on public.orders;
create policy "Quan ly xoa don mon"
  on public.orders for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');
