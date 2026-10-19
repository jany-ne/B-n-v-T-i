import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import ImageField from './ImageField.jsx';

const nextSort = (list) => (list.length ? Math.max(...list.map((m) => m.sort)) + 1 : 1);
const emptyForm = (list = []) => ({ id: '', name: '', description: '', price: '', image_url: '', alt_text: '', sort: String(nextSort(list)), available: true });

const inputClass = 'w-full rounded-md border border-muted bg-surface px-3 py-2 text-text focus-visible:outline-3 focus-visible:outline-accent';
const outlineBtn = 'rounded-md border px-3 py-1.5';

export default function MenuAdmin() {
  const { request } = useAuth();
  const [items, setItems] = useState([]);
  const [values, setValues] = useState(() => emptyForm());
  const [status, setStatus] = useState(null); // { text, isError }
  const [busy, setBusy] = useState(false); // đang gửi form
  const [uploading, setUploading] = useState(false); // đang tải ảnh lên

  const load = useCallback(async () => {
    try {
      const res = await request('/rest/v1/menu_items?select=*&order=sort.asc');
      if (!res.ok) throw new Error(res.status);
      const list = await res.json();
      setItems(list);
      return list;
    } catch (e) {
      if (e.message !== 'expired') setStatus({ isError: true, text: 'Không tải được menu. Bạn đã chạy supabase-menu.sql chưa?' });
      return null;
    }
  }, [request]);

  useEffect(() => {
    load().then((list) => { if (list) setValues(emptyForm(list)); });
  }, [load]);

  function set(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function startEdit(m) {
    setValues({
      id: m.id, name: m.name, description: m.description || '', price: String(m.price),
      image_url: m.image_url || '', alt_text: m.alt_text || '', sort: String(m.sort), available: m.available,
    });
    setStatus(null);
  }

  async function submit(e) {
    e.preventDefault();
    if (uploading) { setStatus({ isError: true, text: 'Ảnh đang được tải lên, vui lòng đợi.' }); return; }
    const name = values.name.trim();
    const price = Number(values.price);
    if (!name) { setStatus({ isError: true, text: 'Vui lòng nhập tên món.' }); return; }
    if (values.price === '' || !Number.isInteger(price) || price < 0) { setStatus({ isError: true, text: 'Giá phải là số nguyên từ 0 trở lên.' }); return; }

    const body = {
      name,
      description: values.description.trim() || null,
      price,
      image_url: values.image_url.trim() || null,
      alt_text: values.alt_text.trim() || null,
      sort: Number(values.sort) || 0,
      available: values.available,
    };
    const editing = values.id;
    setBusy(true);
    try {
      const res = await request(editing ? `/rest/v1/menu_items?id=eq.${encodeURIComponent(editing)}` : '/rest/v1/menu_items', {
        method: editing ? 'PATCH' : 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.status);
      const list = await load();
      setValues(emptyForm(list || items));
      setStatus({ isError: false, text: editing ? 'Đã lưu thay đổi.' : 'Đã thêm món.' });
    } catch (err) {
      if (err.message !== 'expired') setStatus({ isError: true, text: 'Lưu không thành công. Hãy kiểm tra lại thông tin.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(m) {
    if (!window.confirm(`Xóa món "${m.name}" khỏi menu?`)) return;
    try {
      const res = await request(`/rest/v1/menu_items?id=eq.${encodeURIComponent(m.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(res.status);
      setStatus({ isError: false, text: 'Đã xóa món.' });
      load();
    } catch (e) {
      if (e.message !== 'expired') setStatus({ isError: true, text: 'Xóa không thành công.' });
    }
  }

  const editing = Boolean(values.id);

  return (
    <section aria-labelledby="menu-admin-title" className="mt-16 border-t border-bg-alt pt-8">
      <h2 id="menu-admin-title" className="mb-4 text-center text-2xl font-bold">Quản lý menu</h2>

      <form onSubmit={submit} noValidate className="mx-auto mb-6 w-full max-w-lg">
        <div className="mb-4">
          <label htmlFor="mn-name" className="mb-1 block font-bold">Tên món</label>
          <input id="mn-name" className={inputClass} maxLength={100} value={values.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="mb-4">
          <label htmlFor="mn-desc" className="mb-1 block font-bold">Mô tả</label>
          <input id="mn-desc" className={inputClass} maxLength={300} value={values.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="mb-4">
          <label htmlFor="mn-price" className="mb-1 block font-bold">Giá (đồng)</label>
          <input id="mn-price" type="number" min="0" step="1000" inputMode="numeric" className={inputClass} value={values.price} onChange={(e) => set('price', e.target.value)} />
        </div>

        <ImageField value={values.image_url} onChange={(url) => set('image_url', url)} onBusyChange={setUploading} />

        <div className="mb-4">
          <label htmlFor="mn-alt" className="mb-1 block font-bold">Mô tả ảnh (cho người khiếm thị)</label>
          <input id="mn-alt" className={inputClass} maxLength={200} value={values.alt_text} onChange={(e) => set('alt_text', e.target.value)} />
        </div>
        <div className="mb-4">
          <label htmlFor="mn-sort" className="mb-1 block font-bold">Thứ tự hiển thị</label>
          <input id="mn-sort" type="number" min="0" inputMode="numeric" className={inputClass} value={values.sort} onChange={(e) => set('sort', e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input id="mn-available" type="checkbox" checked={values.available} onChange={(e) => set('available', e.target.checked)} className="h-4 w-4" />
            Đang bán (hiện trên trang)
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || uploading} className="rounded-md bg-accent px-7 py-3 font-bold text-on-accent disabled:cursor-not-allowed disabled:opacity-60">
            {editing ? 'Lưu thay đổi' : 'Thêm món'}
          </button>
          {editing && (
            <button type="button" onClick={() => { setValues(emptyForm(items)); setStatus(null); }} className={`${outlineBtn} border-primary text-primary`}>Hủy sửa</button>
          )}
        </div>
        <p role="status" className={`mt-3 font-bold ${status?.isError ? 'text-red-700 dark:text-red-400' : 'text-primary'}`}>{status?.text}</p>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-surface shadow">
          <thead>
            <tr className="bg-bg-alt text-left">
              {['Thứ tự', 'Tên món', 'Giá', 'Trạng thái'].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5">{h}</th>)}
              <th className="px-3 py-2.5"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-b border-bg-alt align-top">
                <td className="px-3 py-2.5">{m.sort}</td>
                <td className="px-3 py-2.5">{m.name}</td>
                <td className="px-3 py-2.5">{Number(m.price).toLocaleString('vi-VN')}đ</td>
                <td className="px-3 py-2.5">{m.available ? 'Đang bán' : 'Đã ẩn'}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <button type="button" aria-label={`Sửa món ${m.name}`} onClick={() => startEdit(m)} className={`${outlineBtn} mr-2 border-primary text-primary`}>Sửa</button>
                  <button type="button" aria-label={`Xóa món ${m.name}`} onClick={() => remove(m)} className={`${outlineBtn} border-red-700 text-red-700 dark:border-red-400 dark:text-red-400`}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
