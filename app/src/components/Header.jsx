import { useEffect, useState } from 'react';
import { NAV } from '../data/site.js';


export default function Header() {
  // useState: biến "nhớ" trạng thái. Đổi giá trị thì React tự vẽ lại giao diện.
  const [open, setOpen] = useState(false);

  // useEffect: chạy một việc phụ (ở đây là lắng nghe phím Escape) khi component xuất hiện.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey); // dọn dẹp khi component biến mất
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-header text-on-header">
      <div className="flex h-16 w-full items-center justify-between px-4 md:px-6">
        <a href="#hero" className="text-xl font-bold">Bạn &amp; Tôi</a>

        <button
          type="button"
          className="rounded p-2 lg:hidden"
          aria-label={open ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen(!open)}
        >
          <span className="block h-0.5 w-6 bg-current" />
          <span className="mt-1.5 block h-0.5 w-6 bg-current" />
          <span className="mt-1.5 block h-0.5 w-6 bg-current" />
        </button>

        <nav
          id="site-nav"
          aria-label="Điều hướng chính"
          className={`${open ? 'block' : 'hidden'} absolute left-0 right-0 top-16 bg-header lg:static lg:block`}
        >
          <ul className="flex flex-col lg:flex-row lg:gap-6">
            {NAV.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="block px-4 py-3 hover:underline lg:px-0" onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
