import { img } from '../data/content.js';

// Cắt một vùng crop=[x, y, rộng, cao] (pixel của ảnh gốc) rồi thu phóng theo --k, dùng làm hình nền trang trí.
export default function ArtCrop({ src, w, h, crop: [x, y, cw, ch], className }) {
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute -z-10 block overflow-hidden ${className}`} style={{ width: `calc(${cw}px * var(--k))`, height: `calc(${ch}px * var(--k))` }}>
      <img
        src={img(src)}
        width={w}
        height={h}
        alt=""
        loading="lazy"
        className="max-w-none"
        style={{ width: `calc(${w}px * var(--k))`, height: `calc(${h}px * var(--k))`, marginLeft: `calc(${-x}px * var(--k))`, marginTop: `calc(${-y}px * var(--k))` }}
      />
    </span>
  );
}
