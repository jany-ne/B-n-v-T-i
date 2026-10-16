-- Thêm chức năng chọn bàn. Chạy file này trong Supabase: SQL Editor > New query > dán > Run.
-- (Chạy SAU supabase.sql. Có thể chạy lại nhiều lần mà không hỏng dữ liệu.)

create extension if not exists btree_gist;

-- Danh sách bàn của quán. Muốn thêm/sửa/xóa bàn: vào Table Editor > restaurant_tables.
create table if not exists public.restaurant_tables (
  id    text primary key,
  name  text not null,
  seats int  not null check (seats between 1 and 20),
  sort  int  not null default 0
);

insert into public.restaurant_tables (id, name, seats, sort) values
  ('B1',  'Bàn 1',  2, 1),
  ('B2',  'Bàn 2',  2, 2),
  ('B3',  'Bàn 3',  2, 3),
  ('B4',  'Bàn 4',  2, 4),
  ('B5',  'Bàn 5',  4, 5),
  ('B6',  'Bàn 6',  4, 6),
  ('B7',  'Bàn 7',  4, 7),
  ('B8',  'Bàn 8',  4, 8),
  ('B9',  'Bàn 9',  6, 9),
  ('B10', 'Bàn 10', 6, 10)
on conflict (id) do nothing;

alter table public.restaurant_tables enable row level security;

drop policy if exists "Ai cung xem danh sach ban" on public.restaurant_tables;
create policy "Ai cung xem danh sach ban"
  on public.restaurant_tables for select
  to anon, authenticated
  using (true);

-- Mỗi đơn đặt bàn gắn với một bàn.
alter table public.bookings
  add column if not exists table_id text references public.restaurant_tables(id);

-- Một bàn được giữ 90 phút cho mỗi lượt: hai đơn cùng bàn không được chồng giờ nhau.
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    table_id with =,
    tsrange(booking_date + booking_time, booking_date + booking_time + interval '90 minutes') with &&
  );

-- Khách chỉ được đặt khi có chọn bàn và bàn đủ chỗ cho số người.
drop policy if exists "Khach duoc dat ban" on public.bookings;
create policy "Khach duoc dat ban"
  on public.bookings for insert
  to anon
  with check (
    table_id is not null
    and guests <= (select t.seats from public.restaurant_tables t where t.id = table_id)
  );

-- Cho khách biết bàn nào đã bị giữ vào khung giờ đã chọn,
-- mà không cho đọc thông tin cá nhân của người đặt (chỉ trả về mã bàn).
create or replace function public.get_taken_tables(p_date date, p_time time)
returns table (table_id text)
language sql
stable
security definer
set search_path = public
as $$
  select b.table_id
  from public.bookings b
  where b.table_id is not null
    and tsrange(b.booking_date + b.booking_time, b.booking_date + b.booking_time + interval '90 minutes')
        && tsrange(p_date + p_time, p_date + p_time + interval '90 minutes');
$$;

grant execute on function public.get_taken_tables(date, time) to anon, authenticated;
