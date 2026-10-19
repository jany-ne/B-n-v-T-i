import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

// Gọi Supabase kèm khóa công khai. Nếu có token đăng nhập của quản lý thì dùng token đó thay cho khóa công khai.
export function api(path, options = {}, token) {
  return fetch(SUPABASE_URL + path, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// Địa chỉ công khai của một ảnh trong kho menu-images.
export const publicImageUrl = (name) => `${SUPABASE_URL}/storage/v1/object/public/menu-images/${name}`;
