import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/supabase.js';
import { SITE } from '../data/site.js';
import { money } from '../data/menu.js';
import { useCart } from '../context/CartContext.jsx';
import { useTurnstile } from '../hooks/useTurnstile.js';
import { validateName, validatePhone } from '../lib/validators.js';

const RULES = {
  name: validateName,
  phone: validatePhone,
  note: (v) => (v.length <= 500 ? '' : 'Ghi chú tối đa 500 ký tự.'),
};

const EMPTY = { name: '', phone: '', note: '' };

const inputClass = 'w-full rounded-md border border-muted bg-surface px-3 py-2 text-text aria-[invalid=true]:border-red-600 focus-visible:outline-3 focus-visible:outline-accent';
const errorClass = 'mt-1 text-sm text-red-700 dark:text-red-400';

export default function CartPage() {
  const { lines, total, setQty, remove, clear, sync } = useCart();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const { ref: captchaRef, token, error: captchaError, setError: setCaptchaError, reset } = useTurnstile();
  const formRef = useRef(null);
  const hasUnavailable = lines.some((l) => l.unavailable);

  // Đối chiếu giỏ với menu mới nhất: cập nhật giá, đánh dấu món không còn bán.
  // Nếu không tải được menu thì giữ nguyên giỏ (máy chủ vẫn kiểm tra lại giá khi đặt).
  useEffect(() => {
    const controller = new AbortController();
    api('/rest/v1/menu_items?select=*&available=eq.true&order=sort.asc', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then((list) => { if (list.length) sync(list); })
      .catch(() => {});
    return () => controller.abort();
  }, [sync]);

  function validate(name, value) {
    const msg = RULES[name](value);
    setErrors((prev) => ({ ...prev, [name]: msg }));
    return msg;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) validate(name, value);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    if (!lines.length) return;

    const invalid = Object.keys(RULES).filter((n) => validate(n, values[n]));
    if (!token) setCaptchaError('Vui lòng xác minh bạn không phải robot.');
    if (hasUnavailable) {
      setStatus({ isError: true, text: 'Có món không còn bán. Vui lòng xóa món đó khỏi giỏ.' });
      return;
    }
    if (invalid.length) { formRef.current.elements[invalid[0]].focus(); return; }
    if (!token) return;

    const order = {
      name: values.name.trim(),
      phone: values.phone.replace(/[\s.\-()]/g, ''),
      note: values.note.trim() || null,
      items: lines.map((l) => ({
        menu_item_id: l.id,
        item_name: l.name,
        size: l.size,
        unit_price: l.unitPrice,
        quantity: l.qty,
      })),
    };

    setSending(true);
    try {
      const res = await api('/functions/v1/order', { method: 'POST', body: JSON.stringify({ token, order }) });
      if (res.status === 400) {
        const r = await res.json().catch(() => ({}));
        const text =
          r.error === 'captcha' ? 'Xác minh không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.'
            : r.error === 'item' ? 'Có món hiện không bán hoặc không có size đã chọn. Vui lòng kiểm tra lại giỏ hàng.'
              : 'Thông tin đặt món chưa hợp lệ. Vui lòng kiểm tra lại.';
        setStatus({ isError: true, text });
      } else if (!res.ok) {
        throw new Error(res.status);
      } else {
        clear();
        setValues(EMPTY);
        setErrors({});
        setStatus({ isError: false, text: `Cảm ơn bạn! Quán đã nhận đơn và sẽ liên hệ xác nhận qua số ${order.phone}. Nhận món tại quán, thanh toán khi lấy.` });
      }
    } catch {
      setStatus({ isError: true, text: `Đặt món không thành công. Vui lòng thử lại hoặc gọi ${SITE.phone.display}.` });
    } finally {
      reset();
      setSending(false);
    }
  }

  function field(name, label, control) {
    const id = `od-${name}`;
    const error = errors[name];
    const props = {
      id,
      name,
      value: values[name],
      onChange: handleChange,
      onBlur: (e) => validate(name, e.target.value),
      'aria-invalid': Boolean(error),
      'aria-describedby': error ? `${id}-error` : undefined,
      className: inputClass,
    };
    return (
      <div className="mb-4">
        <label htmlFor={id} className="mb-1 block font-bold">{label}</label>
        {control(props)}
        {error && <p id={`${id}-error`} className={errorClass}>{error}</p>}
      </div>
    );
  }

  const statusEl = (
    <p role="status" className={`mt-3 font-bold ${status?.isError ? 'text-red-700 dark:text-red-400' : 'text-primary'}`}>
      {status?.text}
    </p>
  );

  return (
    <section className="py-12 md:py-16">
      <div className="page-container">
        <h1 className="mb-3 text-center text-3xl font-bold">Giỏ hàng</h1>
        <p className="mb-7 text-center text-muted">{SITE.hours}. Nhận tại quán, thanh toán khi lấy.</p>

        {!lines.length ? (
          <div className="mx-auto w-full max-w-lg text-center">
            {!status && <p className="mb-4">Giỏ hàng đang trống.</p>}
            <Link to="/" state={{ section: 'menu' }} className="font-bold text-primary underline">Xem menu</Link>
            {statusEl}
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-lg">
            <ul className="m-0 mb-4 list-none divide-y divide-bg-alt rounded-lg bg-surface p-0 shadow">
              {lines.map((l) => {
                const id = `qty-${l.id}-${l.size}`;
                return (
                  <li key={`${l.id}|${l.size}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-bold">{l.name} <span className="font-normal text-muted">size {l.size}</span></p>
                      <p className="text-primary">{money(l.unitPrice)}</p>
                      {l.unavailable && (
                        <p className={errorClass}>Món này không còn bán hoặc không có size này.</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <label htmlFor={id} className="sr-only">Số lượng {l.name} size {l.size}</label>
                      <input
                        id={id}
                        type="number"
                        min={1}
                        max={20}
                        inputMode="numeric"
                        value={l.qty}
                        onChange={(e) => setQty(l.id, l.size, e.target.value)}
                        className="w-16 rounded-md border border-muted bg-surface px-2 py-1 text-text focus-visible:outline-3 focus-visible:outline-accent"
                      />
                      <span className="w-24 text-right font-bold">{money(l.unitPrice * l.qty)}</span>
                      <button
                        type="button"
                        aria-label={`Xóa ${l.name} size ${l.size} khỏi giỏ`}
                        onClick={() => remove(l.id, l.size)}
                        className="rounded-md border border-red-700 px-3 py-1.5 text-red-700 dark:border-red-400 dark:text-red-400"
                      >
                        Xóa
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="mb-2">
              <Link to="/dat-mon" className="font-bold text-primary underline">Chọn thêm món</Link>
            </p>
            <p className="mb-6 text-lg font-bold">
              Tổng cộng: <span className="text-primary">{money(total)}</span>
            </p>

            {field('name', 'Họ tên', (p) => <input type="text" autoComplete="name" maxLength={100} {...p} />)}
            {field('phone', 'Số điện thoại', (p) => <input type="tel" inputMode="tel" autoComplete="tel" {...p} />)}
            {field('note', 'Ghi chú (không bắt buộc)', (p) => <textarea rows={3} maxLength={500} {...p} />)}

            <div className="mb-4">
              <div ref={captchaRef} />
              {captchaError && <p className={errorClass}>{captchaError}</p>}
            </div>

            <button
              type="submit"
              disabled={sending}
              className="rounded-md bg-accent px-7 py-3 font-bold text-on-accent hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Đang gửi...' : 'Đặt món'}
            </button>
            {statusEl}
          </form>
        )}
      </div>
    </section>
  );
}
