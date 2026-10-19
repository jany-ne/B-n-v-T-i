import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { money } from '../../data/menu.js';

const formatWhen = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function OrdersAdmin() {
  const { request } = useAuth();
  const [orders, setOrders] = useState(null);
  const [message, setMessage] = useState('Đang tải...');

  const load = useCallback(async () => {
    try {
      const res = await request('/rest/v1/orders?select=*&order=created_at.desc');
      if (!res.ok) throw new Error(res.status);
      const list = await res.json();
      setOrders(list);
      setMessage(list.length ? `Có ${list.length} đơn món.` : 'Chưa có đơn món nào.');
    } catch (e) {
      if (e.message !== 'expired') setMessage('Không tải được danh sách đơn món. Bạn đã chạy supabase-orders.sql chưa?');
    }
  }, [request]);

  useEffect(() => { load(); }, [load]);

  async function remove(o) {
    if (!window.confirm(`Xóa đơn món của ${o.name}?`)) return;
    try {
      const res = await request(`/rest/v1/orders?id=eq.${encodeURIComponent(o.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(res.status);
      load();
    } catch (e) {
      if (e.message !== 'expired') setMessage('Xóa không thành công.');
    }
  }

  return (
    <section aria-labelledby="orders-title" className="mt-10">
      <h2 id="orders-title" className="mb-2 text-2xl font-bold">Đơn món</h2>
      <p role="status" className="mb-3 font-bold text-primary">{message}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-surface shadow">
          <thead>
            <tr className="bg-bg-alt text-left">
              {['Lúc đặt', 'Họ tên', 'Điện thoại', 'Món', 'SL', 'Tạm tính', 'Ghi chú'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>
              ))}
              <th className="px-3 py-2.5"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-b border-bg-alt align-top">
                <td className="px-3 py-2.5">{formatWhen(o.created_at)}</td>
                <td className="px-3 py-2.5">{o.name}</td>
                <td className="px-3 py-2.5">{o.phone}</td>
                <td className="px-3 py-2.5">{o.item_name}</td>
                <td className="px-3 py-2.5">{o.quantity}</td>
                <td className="px-3 py-2.5">{money(o.unit_price * o.quantity)}</td>
                <td className="px-3 py-2.5">{o.note}</td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    aria-label={`Xóa đơn món của ${o.name}`}
                    onClick={() => remove(o)}
                    className="rounded-md border border-red-700 px-3 py-1.5 text-red-700 dark:border-red-400 dark:text-red-400"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
