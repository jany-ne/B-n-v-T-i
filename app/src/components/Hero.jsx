import { Link } from 'react-router-dom';
import { asset } from '../lib/asset.js';

export default function Hero() {
  return (
    <section id="hero" className="relative isolate overflow-hidden bg-header px-4 py-16 text-center text-white lg:py-28">
      {/* Ảnh nền là thẻ img để trình duyệt chọn đúng kích cỡ theo màn hình và tải sớm (ảnh lớn nhất trang). alt rỗng vì chỉ để trang trí. */}
      <img
        src={asset('images/hero-800.webp')}
        srcSet={`${asset('images/hero-480.webp')} 480w, ${asset('images/hero-800.webp')} 800w, ${asset('images/hero-1170.webp')} 1170w`}
        sizes="100vw"
        width="1170"
        height="781"
        alt=""
        fetchPriority="high"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[rgb(40_28_20/0.65)]" />
      <h1 className="mx-auto mb-3 max-w-2xl text-3xl font-bold leading-tight lg:text-5xl">
        Một tách cà phê, một ngày tươi mới.
      </h1>
      <p>Cà phê rang xay thủ công, không gian ấm cúng giữa lòng thành phố.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" state={{ section: 'menu' }} className="rounded-md bg-accent px-7 py-3 font-bold text-on-accent hover:brightness-110">
          Xem menu
        </Link>
        <Link to="/dat-ban" className="rounded-md border-2 border-white px-7 py-3 font-bold hover:bg-white hover:text-[#3b2a20]">
          Đặt bàn ngay
        </Link>
      </div>
    </section>
  );
}
