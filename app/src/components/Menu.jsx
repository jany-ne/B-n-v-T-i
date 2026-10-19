import { useEffect, useState } from 'react';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

// Menu dự phòng, dùng khi chưa tải được dữ liệu từ Supabase.
const FALLBACK = [
  { id: 1, name: 'Cà phê sữa', description: 'Đậm đà, béo nhẹ.', price: 35000, image_url: 'images/ca-phe-sua.jpg', alt_text: 'Ly cà phê sữa nóng có lớp bọt mịn' },
  { id: 2, name: 'Bạc xỉu', description: 'Nhiều sữa, ít cà phê.', price: 35000, image_url: 'images/bac-xiu.jpg', alt_text: 'Ly bạc xỉu đá với sữa hòa quyện cà phê' },
  { id: 3, name: 'Cold brew', description: 'Ủ lạnh 18 tiếng.', price: 45000, image_url: 'images/cold-brew.jpg', alt_text: 'Ly cold brew đá rót cà phê lên lớp sữa' },
  { id: 4, name: 'Latte', description: 'Espresso và sữa tươi.', price: 50000, image_url: 'images/latte.jpg', alt_text: 'Ly latte với họa tiết lá vẽ bằng sữa' },
  { id: 5, name: 'Cappuccino', description: 'Bọt sữa mịn.', price: 50000, image_url: 'images/cappuccino.jpg', alt_text: 'Tách cappuccino rắc bột quế' },
  { id: 6, name: 'Trà đào', description: 'Thanh mát, thơm nhẹ.', price: 40000, image_url: 'images/tra-dao.jpg', alt_text: 'Ly trà đào với lát đào và lá bạc hà' },
];

const money = (n) => Number(n).toLocaleString('vi-VN') + 'đ';

export default function Menu() {
  const [items, setItems] = useState(FALLBACK);

  useEffect(() => {
    const controller = new AbortController(); // để hủy yêu cầu nếu component biến mất
    fetch(`${SUPABASE_URL}/rest/v1/menu_items?select=*&available=eq.true&order=sort.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then((list) => { if (list.length) setItems(list); })
      .catch(() => {}); // lỗi thì giữ menu dự phòng
    return () => controller.abort();
  }, []);

  return (
    <section id="menu" className="py-12 md:py-16">
      <div className="page-container">
        <h2 className="mb-7 text-center text-2xl font-bold lg:text-3xl">Menu đồ uống</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <article key={it.id} className="overflow-hidden rounded-lg bg-surface shadow">
              {it.image_url && (
                <img
                  src={it.image_url}
                  alt={it.alt_text || it.name}
                  width="600"
                  height="750"
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover"
                />
              )}
              <div className="p-5">
                <h3 className="mb-1 text-lg font-bold">{it.name}</h3>
                {it.description && <p className="mb-3 text-muted">{it.description}</p>}
                <span className="font-bold text-primary">{money(it.price)}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
