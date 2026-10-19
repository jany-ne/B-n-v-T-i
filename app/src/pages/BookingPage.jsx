import { useEffect, useRef, useState } from 'react';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { SITE } from '../data/site.js';
import { useTurnstile } from '../hooks/useTurnstile.js';
import { validateName, validatePhone } from '../lib/validators.js';
import TablePicker from '../components/TablePicker.jsx';

const pad = (n) => String(n).padStart(2, '0');

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Giờ nhận đặt bàn: 9:00 đến 21:30, cách nhau 30 phút.
const SLOTS = Array.from({ length: 26 }, (_, i) => {
  const m = 9 * 60 + i * 30;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
});

const RULES = {
  name: validateName,
  phone: validatePhone,
  date: (v) => (!v ? 'Vui lòng chọn ngày.' : v >= today() ? '' : 'Ngày đặt không được ở quá khứ.'),
  time: (v) => (v ? '' : 'Vui lòng chọn giờ.'),
  guests: (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 20 ? '' : 'Số người từ 1 đến 20.';
  },
  note: (v) => (v.length <= 500 ? '' : 'Ghi chú tối đa 500 ký tự.'),
};

const EMPTY = { name: '', phone: '', date: '', time: '', guests: '2', note: '' };

// Gọi Supabase kèm khóa công khai.
function api(path, options = {}) {
  return fetch(SUPABASE_URL + path, {
    ...options,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', ...options.headers },
  });
}

const inputClass = 'w-full rounded-md border border-muted bg-surface px-3 py-2 text-text aria-[invalid=true]:border-red-600 focus-visible:outline-3 focus-visible:outline-accent';
const errorClass = 'mt-1 text-sm text-red-700 dark:text-red-400';

export default function BookingPage() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [tables, setTables] = useState([]);
  const [taken, setTaken] = useState(() => new Set());
  const [tableId, setTableId] = useState('');
  const [tableError, setTableError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [recheck, setRecheck] = useState(0); // tăng số này để tải lại danh sách bàn đã bị đặt
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const { ref: captchaRef, token, error: captchaError, setError: setCaptchaError, reset } = useTurnstile();
  const formRef = useRef(null);

  const ready = Boolean(values.date && values.time);

  // 1) Tải danh sách bàn một lần khi mở trang.
  useEffect(() => {
    let stale = false;
    api('/rest/v1/restaurant_tables?select=id,name,seats&order=sort.asc')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then((list) => { if (!stale) setTables(list); })
      .catch(() => { if (!stale) setLoadError('Không tải được danh sách bàn. Vui lòng tải lại trang.'); });
    return () => { stale = true; };
  }, []);

  // 2) Mỗi khi đổi ngày hoặc giờ: hỏi bàn nào đã bị đặt. "stale" tránh dùng kết quả của lần hỏi cũ.
  useEffect(() => {
    let stale = false;
    if (!values.date || !values.time) {
      setTaken(new Set());
      return undefined;
    }
    api('/rest/v1/rpc/get_taken_tables', { method: 'POST', body: JSON.stringify({ p_date: values.date, p_time: values.time }) })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then((list) => { if (!stale) { setTaken(new Set(list.map((r) => r.table_id))); setLoadError(''); } })
      .catch(() => { if (!stale) setLoadError('Không kiểm tra được bàn trống. Vui lòng tải lại trang.'); });
    return () => { stale = true; };
  }, [values.date, values.time, recheck]);

  // 3) Nếu bàn đang chọn không còn hợp lệ (bị đặt, hoặc không đủ chỗ) thì bỏ chọn.
  useEffect(() => {
    if (!tableId) return;
    const t = tables.find((x) => x.id === tableId);
    if (!t || !ready || taken.has(tableId) || t.seats < Number(values.guests)) setTableId('');
  }, [tableId, tables, taken, ready, values.guests]);

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
    const noTable = !tableId;
    setTableError(noTable ? 'Vui lòng chọn bàn.' : '');
    if (!token) setCaptchaError('Vui lòng xác minh bạn không phải robot.');

    if (invalid.length) { formRef.current.elements[invalid[0]].focus(); return; }
    if (noTable) { formRef.current.querySelector('input[name="table"]:not(:disabled)')?.focus(); return; }
    if (!token) return;

    const booking = {
      name: values.name.trim(),
      phone: values.phone.replace(/[\s.\-()]/g, ''),
      booking_date: values.date,
      booking_time: values.time,
      guests: Number(values.guests),
      table_id: tableId,
      note: values.note.trim() || null,
    };

    setSending(true);
    try {
      const res = await api('/functions/v1/book', { method: 'POST', body: JSON.stringify({ token, booking }) });
      if (res.status === 409) {
        setRecheck((n) => n + 1);
        setTableId('');
        setStatus({ isError: true, text: 'Bàn này vừa được người khác đặt. Vui lòng chọn bàn khác.' });
      } else if (res.status === 400) {
        const r = await res.json().catch(() => ({}));
        setStatus({ isError: true, text: r.error === 'captcha' ? 'Xác minh không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.' : 'Thông tin đặt bàn chưa hợp lệ. Vui lòng kiểm tra lại.' });
      } else if (!res.ok) {
        throw new Error(res.status);
      } else {
        setValues(EMPTY);
        setErrors({});
        setTableId('');
        setTaken(new Set());
        setStatus({ isError: false, text: `Cảm ơn bạn! Quán đã nhận đơn đặt bàn và sẽ liên hệ xác nhận qua số ${booking.phone}.` });
      }
    } catch {
      setStatus({ isError: true, text: `Đặt bàn không thành công. Vui lòng thử lại hoặc gọi ${SITE.phone.display}.` });
    } finally {
      reset();
      setSending(false);
    }
  }

  // Dựng từng ô nhập. "extra" là các thuộc tính riêng của từng loại ô.
  function field(name, label, control) {
    const id = `bk-${name}`;
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

  const hint = loadError || (!tables.length ? 'Đang tải danh sách bàn...' : !ready ? 'Chọn ngày, giờ và số người để xem bàn trống.' : 'Mỗi lượt đặt giữ bàn trong 90 phút.');

  return (
    <section className="py-12 md:py-16">
      <div className="page-container">
        <h1 className="mb-3 text-center text-3xl font-bold">Đặt bàn</h1>
        <p className="mb-7 text-center text-muted">{SITE.hours}. Chọn ngày, giờ và số người, quán sẽ giữ chỗ cho bạn.</p>

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-lg">
          {field('name', 'Họ tên', (p) => <input type="text" autoComplete="name" maxLength={100} {...p} />)}
          {field('phone', 'Số điện thoại', (p) => <input type="tel" inputMode="tel" autoComplete="tel" {...p} />)}
          {field('date', 'Ngày', (p) => <input type="date" min={today()} {...p} />)}
          {field('time', 'Giờ', (p) => (
            <select {...p}>
              <option value="">Chọn giờ</option>
              {SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          ))}
          {field('guests', 'Số người', (p) => <input type="number" min={1} max={20} inputMode="numeric" {...p} />)}

          <TablePicker
            tables={tables}
            taken={taken}
            guests={Number(values.guests) || 0}
            ready={ready}
            value={tableId}
            onChange={(id) => { setTableId(id); setTableError(''); }}
            error={tableError}
            hint={hint}
          />

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
            {sending ? 'Đang gửi...' : 'Đặt bàn'}
          </button>
          <p role="status" className={`mt-3 font-bold ${status?.isError ? 'text-red-700 dark:text-red-400' : 'text-primary'}`}>
            {status?.text}
          </p>
        </form>
      </div>
    </section>
  );
}
