-- Cho phép upload ảnh món từ trang admin. Chạy trong Supabase: SQL Editor > New query > dán > Run.
-- Trước khi chạy, thay ADMIN_EMAIL (3 chỗ, dùng Tìm và Thay thế tất cả) bằng email tài khoản quản lý.
-- Đừng commit bản đã điền email thật lên GitHub.

-- Kho chứa ảnh công khai (ai cũng xem được ảnh), giới hạn 2MB mỗi ảnh, chỉ nhận JPG/PNG/WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Chỉ tài khoản quản lý mới được tải lên, thay hoặc xóa ảnh.
drop policy if exists "Quan ly tai anh len" on storage.objects;
create policy "Quan ly tai anh len"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'menu-images' and (auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

drop policy if exists "Quan ly thay anh" on storage.objects;
create policy "Quan ly thay anh"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'menu-images' and (auth.jwt() ->> 'email') = 'ADMIN_EMAIL');

drop policy if exists "Quan ly xoa anh" on storage.objects;
create policy "Quan ly xoa anh"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'menu-images' and (auth.jwt() ->> 'email') = 'ADMIN_EMAIL');
