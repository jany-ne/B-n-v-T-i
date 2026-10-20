import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/supabase.js';
import { SITE } from '../data/site.js';
import { FALLBACK_MENU, formatPrices, money, priceOf } from '../data/menu.js';
import { asset } from '../lib/asset.js';
import { useCart } from '../context/CartContext.jsx';

const SIZE_CODES = ['S', 'M', 'L'];
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
        <p className="mb-7 text-center text-muted">{SITE.hours}. Chọn món vào giỏ, nhận tại quán, thanh toán khi lấy.</p>

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
          <ItemChooser key={item.id} item={item} />
        )}
      </div>
    </section>
  );
}

function ItemChooser({ item }) {
  const { add } = useCart();
  const [size, setSize] = useState('S');
  const [qty, setQty] = useState(1);
  const [qtyError, setQtyError] = useState('');
  const [added, setAdded] = useState(null); // { text } sau khi thêm vào giỏ
  const unitPrice = priceOf(item, size) ?? Number(item.price);

  function handleSubmit(e) {
    e.preventDefault();
    const bad = !Number.isInteger(Number(qty)) || Number(qty) < 1 || Number(qty) > 20;
    setQtyError(bad ? 'Số lượng từ 1 đến 20.' : '');
    if (bad) { document.getElementById('od-qty')?.focus(); return; }
    const q = clampQty(qty);
    add(item, size, q);
    setAdded(`Đã thêm ${q} × ${item.name} (size ${size}) vào giỏ.`);
    setQty(1);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-lg">
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

      <button
        type="submit"
        className="rounded-md bg-accent px-7 py-3 font-bold text-on-accent hover:brightness-110"
      >
        Thêm vào giỏ
      </button>

      <div role="status" className="mt-3 font-bold text-primary">
        {added && (
          <>
            <p>{added}</p>
            <p className="mt-1 flex flex-wrap gap-4">
              <Link to="/dat-mon" className="underline">Chọn thêm món</Link>
              <Link to="/gio-hang" className="underline">Xem giỏ hàng</Link>
            </p>
          </>
        )}
      </div>
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
