// Icon theo bộ Feather (MIT), tô đặc và nét đậm như thiết kế. Mỗi icon nằm trong vòng tròn viền đen.
const SIZES = { Facebook: 28, Instagram: 21, Twitter: 23 };

const ICONS = {
  Facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" fill="currentColor" strokeWidth="1" />,
  Instagram: (
    <>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" ry="5" strokeWidth="2.6" />
      <circle cx="12" cy="12" r="3.9" strokeWidth="2.6" />
      <circle cx="17.4" cy="6.6" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  Twitter: <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" fill="currentColor" strokeWidth="1" />,
};

export default function Social({ size = 'md' }) {
  const box = size === 'sm' ? 'size-10' : 'size-[45px]';
  return (
    <ul className="m-0 flex list-none items-center gap-[17px] p-0">
      {Object.entries(ICONS).map(([name, shape]) => (
        <li key={name}>
          <a href="#" aria-label={name} className={`grid ${box} place-items-center rounded-full border border-ink text-ink transition hover:bg-ink hover:text-white`}>
            <svg width={SIZES[name]} height={SIZES[name]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shape}</svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
