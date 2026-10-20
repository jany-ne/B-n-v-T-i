import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { priceOf } from '../data/menu.js';

const KEY = 'ban-va-toi-cart';
const MAX_QTY = 20;
const SIZES = ['S', 'M', 'L'];

const lineKey = (id, size) => `${id}|${size}`;
const clampQty = (n) => Math.min(MAX_QTY, Math.max(1, Math.trunc(Number(n)) || 1));

// Đọc giỏ đã lưu. Dữ liệu hỏng hoặc bị sửa tay thì bỏ qua, không làm trang lỗi.
function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    if (!Array.isArray(list)) return [];
    return list.filter((l) =>
      l && (typeof l.id === 'string' || typeof l.id === 'number') && typeof l.name === 'string' &&
      SIZES.includes(l.size) && Number.isFinite(l.unitPrice) && Number.isInteger(l.qty) && l.qty >= 1 && l.qty <= MAX_QTY);
  } catch {
    return [];
  }
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [lines, setLines] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* trình duyệt chặn lưu thì giỏ chỉ sống trong phiên này */ }
  }, [lines]);

  // Thêm món vào giỏ. Cùng món và cùng size thì cộng dồn số lượng (tối đa 20).
  const add = useCallback((item, size, qty) => {
    setLines((prev) => {
      const key = lineKey(item.id, size);
      const unitPrice = priceOf(item, size);
      const found = prev.find((l) => lineKey(l.id, l.size) === key);
      if (found) return prev.map((l) => (l === found ? { ...l, unitPrice, qty: clampQty(l.qty + qty) } : l));
      return [...prev, { id: item.id, name: item.name, size, unitPrice, qty: clampQty(qty) }];
    });
  }, []);

  const setQty = useCallback((id, size, qty) => {
    setLines((prev) => prev.map((l) => (lineKey(l.id, l.size) === lineKey(id, size) ? { ...l, qty: clampQty(qty) } : l)));
  }, []);

  const remove = useCallback((id, size) => {
    setLines((prev) => prev.filter((l) => lineKey(l.id, l.size) !== lineKey(id, size)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  // Cập nhật tên và giá theo menu mới nhất; món không còn bán hoặc hết size đó thì đánh dấu unavailable.
  const sync = useCallback((menu) => {
    const byId = new Map(menu.map((m) => [String(m.id), m]));
    setLines((prev) => prev.map((l) => {
      const m = byId.get(String(l.id));
      const price = m ? priceOf(m, l.size) : null;
      if (!m || price == null) return { ...l, unavailable: true };
      return { ...l, name: m.name, unitPrice: price, unavailable: false };
    }));
  }, []);

  const value = useMemo(() => ({
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    total: lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
    add, setQty, remove, clear, sync,
  }), [lines, add, setQty, remove, clear, sync]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart phải nằm trong CartProvider');
  return ctx;
}
