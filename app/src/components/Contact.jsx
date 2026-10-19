import { useRef, useState } from 'react';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { useTurnstile } from '../hooks/useTurnstile.js';
import { SITE } from '../data/site.js';

const MAP_QUERY = encodeURIComponent(SITE.address);

// Mỗi trường có một hàm kiểm tra: trả về câu báo lỗi, hoặc chuỗi rỗng nếu hợp lệ.
const RULES = {
  name: (v) => (v.trim() ? '' : 'Vui lòng nhập họ tên.'),
  email: (v) => {
    if (!v.trim()) return 'Vui lòng nhập email.';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Email chưa đúng định dạng.';
  },
  phone: (v) => {
    const digits = v.replace(/[\s.\-()]/g, '');
    if (!digits) return 'Vui lòng nhập số điện thoại.';
    return /^(0|\+84)\d{9}$/.test(digits) ? '' : 'Số điện thoại chưa đúng (VD: 0986 187 111).';
  },
  message: (v) => (v.trim().length >= 10 ? '' : 'Lời nhắn cần ít nhất 10 ký tự.'),
};

const FIELDS = [
  { name: 'name', label: 'Họ tên', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'phone', label: 'Số điện thoại', type: 'tel', autoComplete: 'tel' },
  { name: 'message', label: 'Lời nhắn', textarea: true },
];

const EMPTY = { name: '', email: '', phone: '', message: '' };

const inputClass = 'w-full rounded-md border border-muted bg-surface px-3 py-2 text-text aria-[invalid=true]:border-red-600 focus-visible:outline-3 focus-visible:outline-accent';

export default function Contact() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // { text, isError }
  const [sending, setSending] = useState(false);
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
    if (errors[name]) validate(name, value); // đã báo lỗi thì kiểm tra lại ngay khi người dùng sửa
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);

    const found = Object.keys(RULES).filter((n) => validate(n, values[n]));
    if (!token) setCaptchaError('Vui lòng xác minh bạn không phải robot.');
    if (found.length) {
      formRef.current.elements[found[0]].focus();
      return;
    }
    if (!token) return;

    setSending(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/contact`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, contact: values }),
      });
      if (res.status === 400) {
        const r = await res.json().catch(() => ({}));
        setStatus({ isError: true, text: r.error === 'captcha' ? 'Xác minh không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.' : 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.' });
      } else if (!res.ok) {
        throw new Error(res.status);
      } else {
        setValues(EMPTY);
        setErrors({});
        setStatus({ isError: false, text: 'Cảm ơn bạn! Bạn & Tôi đã nhận được lời nhắn.' });
      }
    } catch {
      setStatus({ isError: true, text: 'Gửi không thành công. Vui lòng thử lại sau hoặc gọi 0986 187 111.' });
    } finally {
      reset();
      setSending(false);
    }
  }

  return (
    <section id="lien-he" className="py-12 md:py-16">
      <div className="page-container">
        <h2 className="mb-7 text-center text-2xl font-bold lg:text-3xl">Liên hệ</h2>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <address className="not-italic text-center lg:text-left">
            <p className="my-1">{SITE.address}</p>
            <p className="my-1">{SITE.hours}</p>
            <p className="my-1">Điện thoại: <a href={`tel:${SITE.phone.tel}`} className="underline">{SITE.phone.display}</a></p>
            <p className="mt-4 flex flex-wrap justify-center gap-3 lg:justify-start">
              {[
                { href: SITE.facebook, label: 'Facebook' },
                { href: SITE.zalo.url, label: `Zalo ${SITE.zalo.display}` },
              ].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener"
                  className="rounded-md border-2 border-primary px-5 py-2.5 font-bold text-primary no-underline hover:bg-primary hover:text-surface"
                >
                  {l.label}<span className="sr-only"> (mở tab mới)</span>
                </a>
              ))}
            </p>
          </address>

          <form ref={formRef} onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-lg lg:mx-0">
            {FIELDS.map((f) => {
              const id = `cf-${f.name}`;
              const error = errors[f.name];
              const common = {
                id,
                name: f.name,
                value: values[f.name],
                onChange: handleChange,
                onBlur: (e) => validate(f.name, e.target.value),
                'aria-invalid': Boolean(error),
                'aria-describedby': error ? `${id}-error` : undefined,
                className: inputClass,
                required: true,
              };
              return (
                <div key={f.name} className="mb-4">
                  <label htmlFor={id} className="mb-1 block font-bold">{f.label}</label>
                  {f.textarea
                    ? <textarea rows={4} {...common} />
                    : <input type={f.type} autoComplete={f.autoComplete} {...common} />}
                  {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>}
                </div>
              );
            })}

            <div className="mb-4">
              <div ref={captchaRef} />
              {captchaError && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{captchaError}</p>}
            </div>

            <button
              type="submit"
              disabled={sending}
              className="rounded-md bg-accent px-7 py-3 font-bold text-on-accent hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Đang gửi...' : 'Gửi lời nhắn'}
            </button>
            <p role="status" className={`mt-3 font-bold ${status?.isError ? 'text-red-700 dark:text-red-400' : 'text-primary'}`}>
              {status?.text}
            </p>
          </form>
        </div>

        <div className="mt-8 text-center">
          <iframe
            title="Bản đồ vị trí quán Bạn & Tôi"
            src={`https://www.google.com/maps?q=${MAP_QUERY}&output=embed`}
            width="600"
            height="360"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="aspect-video min-h-60 w-full rounded-lg border-0"
          />
          <p className="mt-2">
            <a className="underline" href={`https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`} target="_blank" rel="noopener">
              Mở trong Google Maps
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
