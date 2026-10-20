import { useEffect, useState } from 'react';
import { api } from '../lib/supabase.js';
import { FALLBACK_MENU } from '../data/menu.js';

// "Hook" tải menu đang bán từ Supabase, dùng chung cho Menu, trang đặt món và giỏ hàng.
// Trả về { items, status }:
//   status 'loading'  : đang tải, items tạm là menu dự phòng
//   status 'ready'    : lấy được menu từ Supabase, items là menu thật
//   status 'fallback' : lỗi mạng hoặc menu trống, items là menu dự phòng
export function useMenu() {
  const [state, setState] = useState({ items: FALLBACK_MENU, status: 'loading' });

  useEffect(() => {
    const controller = new AbortController(); // để hủy yêu cầu nếu component biến mất
    api('/rest/v1/menu_items?select=*&available=eq.true&order=sort.asc', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then((list) => setState(list.length ? { items: list, status: 'ready' } : { items: FALLBACK_MENU, status: 'fallback' }))
      .catch((e) => { if (e.name !== 'AbortError') setState({ items: FALLBACK_MENU, status: 'fallback' }); });
    return () => controller.abort();
  }, []);

  return state;
}
