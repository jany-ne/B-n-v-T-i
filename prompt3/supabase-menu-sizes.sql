-- Thêm giá size M và L cho menu, và lưu size trên đơn món.
-- Chạy trong Supabase: SQL Editor > New query > dán > Run.
-- (Có thể chạy lại nhiều lần. Cần đã chạy supabase-menu.sql; supabase-orders.sql nếu đã có bảng orders.)

alter table public.menu_items
  add column if not exists price_m int,
  add column if not exists price_l int;

alter table public.menu_items drop constraint if exists menu_items_price_m_check;
alter table public.menu_items add constraint menu_items_price_m_check
  check (price_m is null or price_m >= 0);

alter table public.menu_items drop constraint if exists menu_items_price_l_check;
alter table public.menu_items add constraint menu_items_price_l_check
  check (price_l is null or price_l >= 0);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'orders'
  ) then
    alter table public.orders add column if not exists size text not null default 'S';
    alter table public.orders drop constraint if exists orders_size_check;
    alter table public.orders add constraint orders_size_check check (size in ('S', 'M', 'L'));
  end if;
end $$;
