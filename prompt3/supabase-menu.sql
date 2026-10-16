-- Quản lý menu từ trang admin. Chạy trong Supabase: SQL Editor > New query > dán > Run.
-- Trước khi chạy, thay ADMIN_EMAIL (3 chỗ) bằng email tài khoản quản lý của bạn.
-- Đừng commit bản đã điền email thật lên GitHub.

create table if not exists public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 100),
  description text check (char_length(description) <= 300),
  price       int  not null check (price >= 0),
  image_url   text check (char_length(image_url) <= 500),
  alt_text    text check (char_length(alt_text) <= 200),
  sort        int  not null default 0,
  available   boolean not null default true
);

alter table public.menu_items enable row level security;

-- Ai cũng xem được món đang bán; quản lý xem được tất cả (kể cả món đang ẩn).
drop policy if exists "Xem menu" on public.menu_items;
create policy "Xem menu"
  on public.menu_items for select
  to anon, authenticated
  using (available or (auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

drop policy if exists "Quan ly them mon" on public.menu_items;
create policy "Quan ly them mon"
  on public.menu_items for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

drop policy if exists "Quan ly sua mon" on public.menu_items;
create policy "Quan ly sua mon"
  on public.menu_items for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL')
  with check ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

drop policy if exists "Quan ly xoa mon" on public.menu_items;
create policy "Quan ly xoa mon"
  on public.menu_items for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

-- Dữ liệu ban đầu: 6 món hiện có trên trang (chỉ thêm khi bảng còn trống).
insert into public.menu_items (name, description, price, image_url, alt_text, sort)
select * from (values
  ('Cà phê sữa', 'Đậm đà, béo nhẹ.',        35000, 'images/ca-phe-sua.jpg', 'Ly cà phê sữa nóng có lớp bọt mịn', 1),
  ('Bạc xỉu',    'Nhiều sữa, ít cà phê.',   35000, 'images/bac-xiu.jpg',    'Ly bạc xỉu đá với sữa hòa quyện cà phê', 2),
  ('Cold brew',  'Ủ lạnh 18 tiếng.',        45000, 'images/cold-brew.jpg',  'Ly cold brew đá rót cà phê lên lớp sữa', 3),
  ('Latte',      'Espresso và sữa tươi.',   50000, 'images/latte.jpg',      'Ly latte với họa tiết lá vẽ bằng sữa', 4),
  ('Cappuccino', 'Bọt sữa mịn.',            50000, 'images/cappuccino.jpg', 'Tách cappuccino rắc bột quế', 5),
  ('Trà đào',    'Thanh mát, thơm nhẹ.',    40000, 'images/tra-dao.jpg',    'Ly trà đào với lát đào và lá bạc hà', 6)
) as v(name, description, price, image_url, alt_text, sort)
where not exists (select 1 from public.menu_items);
