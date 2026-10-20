-- Đơn mua món (giỏ hàng nhiều món). Chạy trong Supabase: SQL Editor > New query > dán > Run.
-- Trước khi chạy, thay ADMIN_EMAIL (4 chỗ, dùng Tìm và Thay thế tất cả) bằng email tài khoản quản lý của bạn.
-- Đừng commit bản đã điền email thật lên GitHub.
-- Cần có bảng menu_items (đã chạy supabase-menu.sql) trước file này.
-- Chạy được cả khi chưa có bảng nào lẫn khi đã có bảng orders kiểu cũ (mỗi đơn một món):
-- các đơn cũ được chuyển sang bảng order_items rồi mới bỏ các cột món khỏi bảng orders.
-- Sau khi chạy file này, hãy deploy lại Edge Function "order" (prompt3/supabase-function/order.ts).

-- Một đơn: thông tin người đặt.
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name) between 1 and 100),
  phone      text not null check (phone ~ '^(0|\+84)[0-9]{9}$'),
  note       text check (char_length(note) <= 500),
  status     text not null default 'new' check (status in ('new', 'done', 'cancelled'))
);

-- Các món trong đơn: mỗi dòng một món + size + số lượng.
-- item_name và unit_price là bản chụp lúc đặt, nên đổi giá menu sau này không làm sai đơn cũ.
create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name    text not null check (char_length(item_name) between 1 and 100),
  size         text not null default 'S' check (size in ('S', 'M', 'L')),
  unit_price   int  not null check (unit_price >= 0),
  quantity     int  not null check (quantity between 1 and 20)
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- Chuyển đơn kiểu cũ (một món nằm ngay trên bảng orders) sang order_items.
do $$
declare
  size_expr text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'item_name'
  ) then
    size_expr := case when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'orders' and column_name = 'size'
    ) then 'coalesce(o.size, ''S'')' else '''S''' end;

    execute format($f$
      insert into public.order_items (order_id, menu_item_id, item_name, size, unit_price, quantity)
      select o.id, o.menu_item_id, o.item_name, %s, o.unit_price, o.quantity
      from public.orders o
      where not exists (select 1 from public.order_items i where i.order_id = o.id)
    $f$, size_expr);

    alter table public.orders
      drop column if exists menu_item_id,
      drop column if exists item_name,
      drop column if exists unit_price,
      drop column if exists quantity,
      drop column if exists size;
  end if;
end $$;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

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

-- Xóa đơn thì các món của đơn tự bị xóa theo (on delete cascade).
drop policy if exists "Quan ly xem mon trong don" on public.order_items;
create policy "Quan ly xem mon trong don"
  on public.order_items for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

drop policy if exists "Quan ly xoa mon trong don" on public.order_items;
create policy "Quan ly xoa mon trong don"
  on public.order_items for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');
