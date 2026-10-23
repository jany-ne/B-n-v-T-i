import Button from './Button.jsx';
import ArtCrop from './ArtCrop.jsx';
import { DISHES, LOREM, LOREM_SHORT, LOREM_CARD, img } from '../data/content.js';

// Hai phần "Our Special Dishes" và "Welcome" dùng chung một nền xám trải full width.
export default function Dishes() {
  return (
    <section id="dishes" aria-labelledby="dishes-title" className="relative isolate overflow-x-clip bg-mist pb-24 pt-20 lg:pb-[340px] lg:pt-[88px]">
      {/* Hình nền trang trí đặt theo design PC (rộng 1512px), nằm sau nội dung. Điện thoại: cùng vị trí tương đối, thu nhỏ.
          art_1 được cắt làm hai mảnh (húng quế, rau thơm) đặt ở hai bên tiêu đề; --k là tỉ lệ thu phóng của từng mảnh. */}
      <ArtCrop src="art_1.png" w={847} h={803} crop={[490, 0, 315, 300]} className="opacity-60 left-[-24px] top-[28px] [--k:0.42] sm:left-[calc(50%-340px)] sm:[--k:0.6] lg:left-[calc(50%-476px)] lg:top-[50px] lg:[--k:0.71]" />
      <ArtCrop src="art_1.png" w={847} h={803} crop={[590, 455, 257, 345]} className="opacity-60 right-[-10px] top-[20px] [--k:0.4] sm:right-[calc(50%-300px)] sm:[--k:0.58] lg:left-[calc(50%+184px)] lg:right-auto lg:top-[27px] lg:[--k:0.68]" />
      <img src={img('art_2.png')} width="864" height="923" alt="" aria-hidden="true" loading="lazy" className="pointer-events-none absolute -right-[60px] bottom-[40px] -z-10 w-[400px] max-w-none sm:w-[560px] lg:-right-[2px] lg:bottom-[307px] lg:w-[864px]" />
      <div className="container-x text-center">
        <h2 id="dishes-title" className="m-0 font-serif text-[40px] font-bold leading-tight text-ink lg:text-[60px]">Our Special Dishes</h2>
        <p className="mx-auto mb-0 mt-5 max-w-[400px] lg:mt-6">{LOREM_SHORT}</p>

        <ul className="m-0 mt-40 grid list-none gap-x-[30px] gap-y-32 p-0 sm:grid-cols-2 lg:mt-[183px] lg:grid-cols-4 lg:gap-y-0">
          {DISHES.map((d, i) => (
            <li
              key={d.name}
              className={`relative rounded-[44px_6px_64px_6px] border-2 border-white px-5 pb-10 transition hover:bg-white hover:shadow-[0_20px_40px_-12px_rgba(16,26,36,0.15)] ${i === 0 ? 'bg-white shadow-[0_20px_40px_-12px_rgba(16,26,36,0.15)]' : ''}`}
            >
              <div className="relative mx-auto -mt-[92px] size-[204px]">
                <img src={img(d.image)} width="414" height="414" alt={d.alt} loading="lazy" className="size-full object-contain" />
                <span className="absolute -right-4 top-[38px] grid size-[55px] place-items-center rounded-full bg-ink text-base font-bold text-white shadow-lg">{d.price}</span>
              </div>
              <h3 className="m-0 mt-6 font-serif text-xl font-bold text-ink">{d.name}</h3>
              <p className="mb-0 mt-[21px] text-[15px] leading-[26px]">{LOREM_CARD}</p>
            </li>
          ))}
        </ul>
      </div>

      <div id="about" className="container-x mt-24 grid items-center gap-10 lg:mt-[120px] lg:grid-cols-[minmax(0,688px)_minmax(0,1fr)] lg:gap-0">
        <img
          src={img('plate-welcome.webp')}
          width="1536"
          height="1346"
          alt="Papaya salad on a black plate with fresh basil leaves"
          loading="lazy"
          className="mx-auto block h-auto w-full max-w-[560px] lg:-ml-[68px] lg:w-[758px] lg:max-w-none"
        />
        <div>
          <h2 className="m-0 max-w-[460px] font-serif text-[40px] font-bold leading-tight text-ink lg:text-[46px] lg:leading-[1.1] xl:text-[60px]">Wecome to Our Restaurant</h2>
          <p className="mb-0 mt-6 max-w-[380px]">{LOREM}</p>
          <div className="mt-8 flex flex-wrap gap-5 lg:mt-[44px]">
            <Button variant="dark" className="w-[120px] px-0">Menu</Button>
            <Button>Book a table</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
