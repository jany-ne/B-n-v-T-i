import { useEffect, useState } from 'react';
import Logo from './Logo.jsx';
import Button from './Button.jsx';
import { NAV } from '../data/content.js';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Cuộn quá 24px thì thanh header thu gọn, có nền mờ và bóng.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const solid = scrolled || open;

  return (
    // <header> giữ chỗ (đúng chiều cao ban đầu) để nội dung bên dưới không bị nhảy khi thanh bên trong chuyển sang fixed.
    <header className="relative z-30 h-24 lg:h-[124px]">
      <div
        className={`fixed inset-x-0 top-0 transition-[background-color,box-shadow,backdrop-filter] duration-300 ease-out ${
          solid ? 'bg-white/85 shadow-[0_8px_24px_-12px_rgba(16,26,36,0.18)] backdrop-blur-md' : 'bg-white/0 shadow-none'
        }`}
      >
      <div
        className={`container-x flex items-center justify-between transition-[padding] duration-300 ease-out lg:grid lg:grid-cols-[359px_1fr_auto] ${
          scrolled ? 'py-3 lg:py-3' : 'py-6 lg:pb-0 lg:pt-[64px]'
        }`}
      >
        <Logo className={`transition-transform duration-300 ease-out ${scrolled ? '' : 'lg:-translate-y-2.5'}`} />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="m-0 flex list-none gap-[46px] p-0 text-base font-normal text-ink">
            {NAV.map((item) => (
              <li key={item.label}><a href={item.href} className="hover:text-orange">{item.label}</a></li>
            ))}
          </ul>
        </nav>

        <div className="hidden lg:block"><Button>Book a table</Button></div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="grid size-11 place-content-center gap-[6px] rounded-lg lg:hidden"
        >
          {[0, 1, 2].map((n) => <span key={n} className="block h-0.5 w-7 bg-ink" />)}
        </button>
      </div>

      {open && (
        <nav aria-label="Mobile" className="container-x pb-6 lg:hidden">
          <ul className="m-0 list-none p-0">
            {NAV.map((item) => (
              <li key={item.label}><a href={item.href} onClick={() => setOpen(false)} className="block py-3 text-lg font-medium text-ink">{item.label}</a></li>
            ))}
          </ul>
          <Button className="mt-3 w-full">Book a table</Button>
        </nav>
      )}
      </div>
    </header>
  );
}
