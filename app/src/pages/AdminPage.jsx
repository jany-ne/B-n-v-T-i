import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import BookingsAdmin from '../components/admin/BookingsAdmin.jsx';
import OrdersAdmin from '../components/admin/OrdersAdmin.jsx';
import MenuAdmin from '../components/admin/MenuAdmin.jsx';

function LoginForm() {
  const { login, notice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      setPassword('');
    } catch {
      setError('Email hoặc mật khẩu không đúng.');
    } finally {
      setBusy(false);
    }
  }

  const inputClass = 'w-full rounded-md border border-muted bg-surface px-3 py-2 text-text focus-visible:outline-3 focus-visible:outline-accent';
  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-lg">
      <div className="mb-4">
        <label htmlFor="ad-email" className="mb-1 block font-bold">Email</label>
        <input id="ad-email" type="email" autoComplete="username" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="mb-4">
        <label htmlFor="ad-password" className="mb-1 block font-bold">Mật khẩu</label>
        <input id="ad-password" type="password" autoComplete="current-password" required className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="submit" disabled={busy} className="rounded-md bg-accent px-7 py-3 font-bold text-on-accent disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
      <p role="alert" className="mt-3 font-bold text-red-700 dark:text-red-400">{error || notice}</p>
    </form>
  );
}

export default function AdminPage() {
  const { token, logout } = useAuth();

  return (
    <section className="py-12 md:py-16">
      <div className="page-container">
        <h1 className="mb-7 text-center text-3xl font-bold">Quản lý</h1>
        {token ? (
          <>
            <button type="button" onClick={logout} className="mb-4 rounded-md border border-primary px-4 py-2 text-primary">Đăng xuất</button>
            <BookingsAdmin />
            <OrdersAdmin />
            <MenuAdmin />
          </>
        ) : (
          <LoginForm />
        )}
      </div>
    </section>
  );
}
