import { img } from '../data/content.js';

// Logo xuất từ Figma (SVG, chữ đã chuyển thành đường vẽ nên không phụ thuộc font).
export default function Logo({ className = '' }) {
  return (
    <a href="#top" className={`inline-flex items-center ${className}`}>
      <img src={img('logo.svg')} width="198" height="55" alt="restaurant, back to top" className="h-[48px] w-auto lg:h-[60px]" />
    </a>
  );
}
