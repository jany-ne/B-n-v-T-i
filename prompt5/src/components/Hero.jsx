import ArtCrop from './ArtCrop.jsx';
import Button from './Button.jsx';
import Social from './Social.jsx';
import { LOREM, img } from '../data/content.js';

export default function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate scroll-mt-[124px] overflow-x-clip pb-20 lg:pb-[150px]">
      <div className="container-x relative grid gap-12 pt-[112px] sm:pt-[128px] lg:grid-cols-[minmax(0,1fr)_516px] lg:gap-[96px] lg:pt-0">
        {/* Đường cong và chữ tròn "DELICIOSE FOODS" trang trí, dựng lại từ ảnh Figma (tỉ lệ 0,5 so với ảnh gốc).
            - Đường cong: 3 vòng tròn đầy đủ vẽ bằng SVG (bán kính 480px, tâm đo từ ảnh), nên kéo dài tự nhiên ở mọi độ rộng.
            - Chữ tròn là ảnh nhỏ riêng, nằm cách lề trái tiêu đề 61px như thiết kế.
            Trên điện thoại/tablet cả nhóm được thu nhỏ (scale) nhưng giữ nguyên bố cục như desktop, chữ tròn nằm ngay phía trên tiêu đề.
            Cả nhóm neo vào mép KHUNG NỘI DUNG (lệch trái 358px), không phải mép màn hình, nên đi theo nội dung khi đổi độ rộng.
            max(...) giữ chữ tròn không bị cắt khi màn hình hẹp: lề trái nhóm không đi xa hơn -277px so với mép màn hình.
            Mép khung nội dung cách mép màn hình max(0, (100vw - 1152px) / 2). */}
        <div
          aria-hidden="true"
          style={{ '--l': 'max(-358px, calc(-277px - max(0px, (100vw - 1152px) / 2)))' }}
          className="pointer-events-none absolute -left-[137px] -top-[221px] h-[647px] w-[691px] origin-top-left scale-[0.6] sm:-left-[181px] sm:-top-[278px] sm:scale-75 lg:left-[var(--l)] lg:-top-[247px] lg:scale-100"
        >
          <svg width="691" height="647" viewBox="0 0 691 647" fill="none" stroke="#000" className="absolute inset-0 overflow-visible">
            <circle cx="178.4" cy="74.9" r="480" strokeWidth="2" strokeOpacity="0.2" />
            <circle cx="123" cy="142.4" r="480" strokeWidth="2" strokeOpacity="0.2" />
            <circle cx="210.6" cy="166.1" r="480" strokeWidth="1" strokeOpacity="0.2" />
          </svg>
          <img src={img('hero-badge.webp')} width="116" height="115" alt="" className="absolute left-[295px] top-[384.5px] max-w-none" />
        </div>

        <div className="relative lg:pt-[323px]">
          <h1 id="hero-title" className="m-0 font-serif text-[44px] font-bold leading-[1.1] text-ink sm:text-[56px] lg:text-[70px] lg:leading-[72px]">
            We provide the best food for you
          </h1>
          <p className="mb-0 mt-8 max-w-[380px] lg:mt-[66px]">{LOREM}</p>
          <div className="mt-8 flex flex-wrap gap-5 lg:mt-[47px]">
            <Button variant="dark" className="w-[120px] px-0">Menu</Button>
            <Button>Book a table</Button>
          </div>
          <div className="mt-12 flex items-center gap-6 lg:mt-[94px]">
            <Social />
            <span aria-hidden="true" className="hidden h-px w-[143px] bg-[#d9dcdf] sm:block" />
          </div>
        </div>

        <div className="relative lg:mt-[200px]">
          {/* Nét vẽ thảo mộc (art_1) nằm sau ảnh nhà hàng, đặt theo design PC; điện thoại thu nhỏ cùng vị trí tương đối */}
          <ArtCrop src="art_1.png" w={847} h={803} crop={[0, 30, 450, 200]} className="-left-[40px] -top-[34px] [--k:0.4] sm:-left-[80px] sm:-top-[50px] sm:[--k:0.55] lg:-left-[173px] lg:-top-[83px] lg:[--k:0.78]" />
          <ArtCrop src="art_1.png" w={847} h={803} crop={[490, 0, 315, 300]} className="-right-[16px] -top-[56px] [--k:0.4] sm:-right-[30px] sm:-top-[80px] sm:[--k:0.55] lg:-right-[118px] lg:-top-[115px] lg:[--k:0.74]" />
          <ArtCrop src="art_1.png" w={847} h={803} crop={[590, 455, 257, 345]} className="-right-[22px] top-[52%] [--k:0.36] sm:-right-[40px] sm:[--k:0.5] lg:-right-[158px] lg:top-[347px] lg:[--k:0.8]" />
          {/* Ảnh đã bo góc sẵn từ Figma (góc trong suốt) nên không bo thêm bằng CSS */}
          <img
            src={img('hero-interior.webp')}
            width="1032"
            height="1424"
            alt="Restaurant interior with warm hanging lamps and wooden tables"
            fetchPriority="high"
            className="block h-auto w-full"
          />
          <img
            src={img('plate-papaya.webp')}
            width="364"
            height="364"
            alt="Papaya salad on a black plate"
            className="absolute -bottom-2 -left-6 size-[200px] sm:size-[260px] lg:bottom-[25px] lg:-left-[196px] lg:size-[340px]"
          />
        </div>
      </div>
    </section>
  );
}
