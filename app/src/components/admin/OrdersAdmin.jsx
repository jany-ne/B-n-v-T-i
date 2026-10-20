import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { money } from '../../data/menu.js';

const STATUS_LABEL = { new: 'Mới', done: 'Đã xong', cancelled: 'Đã hủy' };
const statusOf = (o) => (STATUS_LABEL[o.status] ? o.status : 'new');

const outlineBtn = 'rounded-md border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-60';

const orderTotal = (o) => (o.order_items ?? []).reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

const formatWhen = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function OrdersAdmin() {
  const { request } = useAuth();
  const [orders, setOrders] = useState(null);
  const [message, setMessage] = useState(null); // lỗi hoặc kết quả của thao tác gần nhất; trống thì hiện số đơn
  const [filter, setFilter] = useState('all');
  const [pending, setPending] = useState(() => new Set()); // id các đơn đang đổi trạng thái

  const load = useCallback(async () => {
    try {
      const res = await request('/rest/v1/orders?select=*,order_items(*)&order=created_at.desc');
      if (!res.ok) throw new Error(res.status);
      const list = await res.json();
      setOrders(list);
      setMessage(null);
    } catch (e) {
      if (e.message !== 'expired') setMessage({ isError: true, text: 'Không tải được danh sách đơn món. Bạn đã chạy supabase-orders.sql (bản mới có order_items) chưa?' });
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
      if (e.message !== 'expired') setMessage({ isError: true, text: 'Xóa không thành công.' });
    }
  }

  // Đổi trạng thái: cập nhật giao diện ngay cho nhanh, nếu máy chủ từ chối thì trả về trạng thái cũ.
  async function changeStatus(o, next) {
    const prev = statusOf(o);
    const patch = (status) => setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status } : x)));
    setPending((p) => new Set(p).add(o.id));
    patch(next);
    setMessage(null);
    try {
      const res = await request(`/rest/v1/orders?id=eq.${encodeURIComponent(o.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(res.status);
      setMessage({ isError: false, text: `Đã chuyển đơn của ${o.name} sang "${STATUS_LABEL[next]}".` });
    } catch (e) {
      patch(prev);
      if (e.message !== 'expired') setMessage({ isError: true, text: `Không đổi được trạng thái đơn của ${o.name}. Đã trả về "${STATUS_LABEL[prev]}".` });
    } finally {
      setPending((p) => { const n = new Set(p); n.delete(o.id); return n; });
    }
  }

  const visible = (orders ?? []).filter((o) => filter === 'all' || statusOf(o) === filter);
  const summary = orders === null ? 'Đang tải...'
    : !orders.length ? 'Chưa có đơn món nào.'
      : filter === 'all' ? `Có ${orders.length} đơn món.`
        : `Có ${visible.length} đơn "${STATUS_LABEL[filter]}" trong ${orders.length} đơn món.`;
  const shown = message ?? { isError: false, text: summary };

  return (
    <section aria-labelledby="orders-title" className="mt-10">
      <h2 id="orders-title" className="mb-2 text-2xl font-bold">Đơn món</h2>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label htmlFor="od-filter" className="font-bold">Lọc theo trạng thái</label>
        <select
          id="od-filter"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setMessage(null); }}
          className="rounded-md border border-muted bg-surface px-3 py-1.5 text-text focus-visible:outline-3 focus-visible:outline-accent"
        >
          <option value="all">Tất cả</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <p role="status" className={`mb-3 font-bold ${shown.isError ? 'text-red-700 dark:text-red-400' : 'text-primary'}`}>{shown.text}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-surface shadow">
          <thead>
            <tr className="bg-bg-alt text-left">
              {['Lúc đặt', 'Họ tên', 'Điện thoại', 'Món', 'Tổng', 'Ghi chú', 'Trạng thái'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>
              ))}
              <th className="px-3 py-2.5"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <tr key={o.id} className="border-b border-bg-alt align-top">
                <td className="px-3 py-2.5">{formatWhen(o.created_at)}</td>
                <td className="px-3 py-2.5">{o.name}</td>
                <td className="px-3 py-2.5">{o.phone}</td>
                <td className="px-3 py-2.5">
                  <ul className="m-0 list-none p-0">
                    {(o.order_items ?? []).map((i) => (
                      <li key={i.id}>{i.item_name} (size {i.size}) × {i.quantity}</li>
                    ))}
                  </ul>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">{money(orderTotal(o))}</td>
                <td className="px-3 py-2.5">{o.note}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-bold">{STATUS_LABEL[statusOf(o)]}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  {statusOf(o) === 'new' ? (
                    <>
                      <button
                        type="button"
                        aria-label={`Đánh dấu đã xong đơn của ${o.name}`}
                        disabled={pending.has(o.id)}
                        onClick={() => changeStatus(o, 'done')}
                        className={`${outlineBtn} mr-2 border-primary text-primary`}
                      >
                        Xong
                      </button>
                      <button
                        type="button"
                        aria-label={`Hủy đơn của ${o.name}`}
                        disabled={pending.has(o.id)}
                        onClick={() => changeStatus(o, 'cancelled')}
                        className={`${outlineBtn} mr-2 border-primary text-primary`}
                      >
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Mở lại đơn của ${o.name}`}
                      disabled={pending.has(o.id)}
                      onClick={() => changeStatus(o, 'new')}
                      className={`${outlineBtn} mr-2 border-primary text-primary`}
                    >
                      Mở lại
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Xóa đơn món của ${o.name}`}
                    onClick={() => remove(o)}
                    className={`${outlineBtn} border-red-700 text-red-700 dark:border-red-400 dark:text-red-400`}
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
