import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section
      id="hero"
      className="bg-cover bg-center px-4 py-16 text-center text-white lg:py-28"
      style={{ backgroundImage: 'linear-gradient(rgb(40 28 20 / 0.65), rgb(40 28 20 / 0.65)), url(images/hero.jpg)' }}
    >
      <h1 className="mx-auto mb-3 max-w-2xl text-3xl font-bold leading-tight lg:text-5xl">
        Một tách cà phê, một ngày tươi mới, nơi kết nối những tâm hồn yêu cà phê.
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
