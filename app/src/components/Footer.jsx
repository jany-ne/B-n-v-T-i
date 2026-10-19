import { NAV, SITE } from '../data/site.js';

const linkClass = 'underline-offset-2 hover:underline focus-visible:underline';

export default function Footer() {
  return (
    <footer className="bg-header text-on-header">
      <div className="page-container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-xl font-bold">{SITE.name}</p>
          <p className="my-1">{SITE.address}</p>
          <p className="my-1">{SITE.hours}</p>
        </div>

        <nav aria-label="Liên kết nhanh">
          <p className="mb-2 font-bold">Liên kết nhanh</p>
          <ul className="m-0 list-none p-0">
            {NAV.map((l) => (
              <li key={l.href} className="my-1">
                <a href={l.href} className={linkClass}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="mb-2 font-bold">Kết nối với quán</p>
          <ul className="m-0 list-none p-0">
            <li className="my-1">
              <a href={`tel:${SITE.phone.tel}`} className={linkClass}>Gọi {SITE.phone.display}</a>
            </li>
            <li className="my-1">
              <a href={SITE.zalo.url} target="_blank" rel="noopener" className={linkClass}>
                Zalo {SITE.zalo.display}<span className="sr-only"> (mở tab mới)</span>
              </a>
            </li>
            <li className="my-1">
              <a href={SITE.facebook} target="_blank" rel="noopener" className={linkClass}>
                Facebook<span className="sr-only"> (mở tab mới)</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <p className="m-0 border-t border-white/15 py-4 text-center text-sm">
        © 2026 {SITE.name}
      </p>
    </footer>
  );
}
