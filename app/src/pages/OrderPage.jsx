import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/supabase.js';
import { SITE } from '../data/site.js';
import { FALLBACK_MENU, formatPrices, money, priceOf } from '../data/menu.js';

const SIZE_CODES = ['S', 'M', 'L'];
import { asset } from '../lib/asset.js';
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

function clampQty(n) {
  const v = Number(n);
  if (!Number.isInteger(v)) return 1;
  return Math.min(20, Math.max(1, v));
}

export default function OrderPage() {
  const [params] = useSearchParams();
  const mon = params.get('mon') || '';
  const [items, setItems] = useState(null); // null = đang tải

  useEffect(() => {
    const controller = new AbortController();
    api('/rest/v1/menu_items?select=*&available=eq.true&order=sort.asc', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then((list) => { setItems(list.length ? list : FALLBACK_MENU); })
      .catch((e) => { if (e.name !== 'AbortError') setItems(FALLBACK_MENU); });
    return () => controller.abort();
  }, []);

  const item = items && mon ? items.find((it) => String(it.id) === mon) : null;

  return (
    <section className="py-12 md:py-16">
      <div className="page-container">
        <h1 className="mb-3 text-center text-3xl font-bold">Đặt món</h1>
        <p className="mb-7 text-center text-muted">{SITE.hours}. Nhận tại quán, thanh toán khi lấy.</p>

        {items === null ? (
          <p className="text-center text-muted">Đang tải menu...</p>
        ) : !mon ? (
          <ItemPicker items={items} />
        ) : !item ? (
          <p className="text-center">
            Món này không còn bán.{' '}
            <Link to="/" state={{ section: 'menu' }} className="font-bold text-primary underline">Xem menu</Link>
          </p>
        ) : (
          <OrderForm key={item.id} item={item} />
        )}
      </div>
    </section>
  );
}

function OrderForm({ item }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [size, setSize] = useState('S');
  const [qty, setQty] = useState(1);
  const [qtyError, setQtyError] = useState('');
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const unitPrice = priceOf(item, size) ?? Number(item.price);
  const { ref: captchaRef, token, error: captchaError, setError: setCaptchaError, reset } = useTurnstile();
  const formRef = useRef(null);

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

    const invalid = Object.keys(RULES).filter((n) => validate(n, values[n]));
    const q = clampQty(qty);
    const badQty = !Number.isInteger(Number(qty)) || Number(qty) < 1 || Number(qty) > 20;
    setQtyError(badQty ? 'Số lượng từ 1 đến 20.' : '');
    if (!token) setCaptchaError('Vui lòng xác minh bạn không phải robot.');

    if (invalid.length) { formRef.current.elements[invalid[0]].focus(); return; }
    if (badQty) { formRef.current.elements.qty?.focus(); return; }
    if (!token) return;

    const order = {
      name: values.name.trim(),
      phone: values.phone.replace(/[\s.\-()]/g, ''),
      menu_item_id: item.id,
      item_name: item.name,
      size,
      unit_price: unitPrice,
      quantity: q,
      note: values.note.trim() || null,
    };

    setSending(true);
    try {
      const res = await api('/functions/v1/order', { method: 'POST', body: JSON.stringify({ token, order }) });
      if (res.status === 400) {
        const r = await res.json().catch(() => ({}));
        const text =
          r.error === 'captcha' ? 'Xác minh không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.'
            : r.error === 'item' ? 'Món này hiện không bán. Vui lòng chọn món khác.'
              : 'Thông tin đặt món chưa hợp lệ. Vui lòng kiểm tra lại.';
        setStatus({ isError: true, text });
      } else if (!res.ok) {
        throw new Error(res.status);
      } else {
        setValues(EMPTY);
        setErrors({});
        setQty(1);
        setSize('S');
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

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-lg">
      <div className="mb-6 flex gap-4 overflow-hidden rounded-lg bg-surface shadow">
        {item.image_url && (
          <img
            src={asset(item.image_url)}
            alt={item.alt_text || item.name}
            width="120"
            height="150"
            className="h-28 w-24 shrink-0 object-cover"
          />
        )}
        <div className="min-w-0 py-3 pr-4">
          <h2 className="text-xl font-bold">{item.name}</h2>
          {item.description && <p className="text-muted">{item.description}</p>}
        </div>
      </div>

      <fieldset className="m-0 mb-4 border-0 p-0">
        <legend className="mb-1.5 p-0 font-bold">Size</legend>
        <div className="flex flex-wrap gap-6">
          {SIZE_CODES.map((code) => {
            const available = priceOf(item, code) != null;
            return (
              <label
                key={code}
                className={`flex items-center gap-2 ${available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
              >
                <input
                  type="radio"
                  name="size"
                  value={code}
                  checked={size === code}
                  disabled={!available}
                  onChange={() => setSize(code)}
                  aria-label={`Size ${code}`}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                {code}
              </label>
            );
          })}
        </div>
        <p className="mt-3 font-bold text-primary">{money(unitPrice)}</p>
      </fieldset>

      <div className="mb-4">
        <label htmlFor="od-qty" className="mb-1 block font-bold">Số lượng</label>
        <input
          id="od-qty"
          name="qty"
          type="number"
          min={1}
          max={20}
          inputMode="numeric"
          value={qty}
          onChange={(e) => { setQty(e.target.value); setQtyError(''); }}
          onBlur={(e) => {
            const bad = !Number.isInteger(Number(e.target.value)) || Number(e.target.value) < 1 || Number(e.target.value) > 20;
            setQtyError(bad ? 'Số lượng từ 1 đến 20.' : '');
            if (!bad) setQty(clampQty(e.target.value));
          }}
          aria-invalid={Boolean(qtyError)}
          aria-describedby={qtyError ? 'od-qty-error' : undefined}
          className={inputClass}
        />
        {qtyError && <p id="od-qty-error" className={errorClass}>{qtyError}</p>}
      </div>

      <p className="mb-4 font-bold">
        Tạm tính: <span className="text-primary">{money(unitPrice * clampQty(qty))}</span>
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
      <p role="status" className={`mt-3 font-bold ${status?.isError ? 'text-red-700 dark:text-red-400' : 'text-primary'}`}>
        {status?.text}
      </p>
    </form>
  );
}

function ItemPicker({ items }) {
  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="mb-4 text-center">Chọn món bạn muốn mua:</p>
      <ul className="m-0 list-none divide-y divide-bg-alt rounded-lg bg-surface p-0 shadow">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              to={`/dat-mon?mon=${encodeURIComponent(it.id)}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-alt"
            >
              <span className="font-bold">{it.name}</span>
              <span className="text-primary">{formatPrices(it)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
