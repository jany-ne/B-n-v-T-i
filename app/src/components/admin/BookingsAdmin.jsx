import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

const formatDate = (iso) => iso.split('-').reverse().join('/');

export default function BookingsAdmin() {
  const { request } = useAuth();
  const [bookings, setBookings] = useState(null); // null = đang tải
  const [message, setMessage] = useState('Đang tải...');

  const load = useCallback(async () => {
    try {
      const res = await request('/rest/v1/bookings?select=*,restaurant_tables(name)&order=booking_date.asc,booking_time.asc');
      if (!res.ok) throw new Error(res.status);
      const list = await res.json();
      setBookings(list);
      setMessage(list.length ? `Có ${list.length} đơn đặt bàn.` : 'Chưa có đơn đặt bàn nào.');
    } catch (e) {
      if (e.message !== 'expired') setMessage('Không tải được danh sách. Hãy đăng nhập lại bằng đúng tài khoản quản lý.');
    }
  }, [request]);

  useEffect(() => { load(); }, [load]);

  async function remove(b) {
    if (!window.confirm(`Xóa đơn đặt bàn của ${b.name}?`)) return;
    try {
      const res = await request(`/rest/v1/bookings?id=eq.${encodeURIComponent(b.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(res.status);
      load();
    } catch (e) {
      if (e.message !== 'expired') setMessage('Xóa không thành công.');
    }
  }

  return (
    <section aria-labelledby="bookings-title">
      <h2 id="bookings-title" className="mb-2 text-2xl font-bold">Đơn đặt bàn</h2>
      <p role="status" className="mb-3 font-bold text-primary">{message}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-surface shadow">
          <thead>
            <tr className="bg-bg-alt text-left">
              {['Ngày', 'Giờ', 'Bàn', 'Họ tên', 'Điện thoại', 'Số người', 'Ghi chú'].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>
              ))}
              <th className="px-3 py-2.5"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {(bookings ?? []).map((b) => (
              <tr key={b.id} className="border-b border-bg-alt align-top">
                <td className="px-3 py-2.5">{formatDate(b.booking_date)}</td>
                <td className="px-3 py-2.5">{b.booking_time.slice(0, 5)}</td>
                <td className="px-3 py-2.5">{b.restaurant_tables ? `${b.restaurant_tables.name}:` : ''}</td>
                <td className="px-3 py-2.5">{b.name}</td>
                <td className="px-3 py-2.5">{b.phone}</td>
                <td className="px-3 py-2.5">{b.guests}</td>
                <td className="px-3 py-2.5">{b.note}</td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    aria-label={`Xóa đơn của ${b.name}`}
                    onClick={() => remove(b)}
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
