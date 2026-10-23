import Logo from './Logo.jsx';
import Social from './Social.jsx';
import { FOOTER, img } from '../data/content.js';

const heading = 'm-0 text-xs font-bold uppercase leading-none text-ink';

function LinkColumn({ title, links }) {
  return (
    <nav aria-label={title} className="w-[195px] max-w-full min-[1080px]:pt-[44px]">
      <h2 className={heading}>{title}</h2>
      <ul className="m-0 mt-5 grid list-none gap-[10px] p-0">
        {links.map((l) => {
          const { label, href = '#' } = typeof l === 'string' ? { label: l } : l;
          return <li key={label}><a href={href} className="hover:text-orange">{label}</a></li>;
        })}
      </ul>
    </nav>
  );
}

export default function Footer() {
  return (
    <footer id="contact" className="relative isolate overflow-hidden pt-16 lg:pb-[195px] lg:pt-[72px]">
      {/* Hình nền chảo trứng rất nhạt: PC đặt theo design (lệch trái tâm 436px, sát đáy), điện thoại thu nhỏ sát đáy bên phải */}
      <img src={img('art_5.png')} width="1123" height="689" alt="" aria-hidden="true" loading="lazy" className="pointer-events-none absolute -right-[140px] bottom-0 -z-10 w-[440px] max-w-none sm:-right-[100px] sm:w-[620px] lg:left-[calc(50%-436px)] lg:right-auto lg:w-[1123px]" />
      <div className="container-x relative flex flex-wrap gap-y-12">
        {/* Các cột xếp hàng ngang, hết chỗ mới tự xuống dòng (không cắt cứng theo breakpoint) */}
        <div className="w-[486px] max-w-full">
          <Logo />
          <p className="mb-0 mt-3 max-w-[400px]">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore .<a href="#" className="underline">Learn more</a></p>
          <h2 className={`${heading} mt-[37px]`}>Opening hours</h2>
          <dl className="m-0 mt-[29px] grid gap-4 whitespace-nowrap sm:grid-cols-[191px_191px_auto] sm:gap-x-0">
            {FOOTER.hours.map(([day, time]) => (
              <div key={day}>
                <dt>{day}</dt>
                <dd className="m-0">{time}</dd>
              </div>
            ))}
          </dl>
        </div>

        <LinkColumn title="Navigation" links={FOOTER.navigation} />
        <LinkColumn title="Dishes" links={FOOTER.dishes} />
        <div className="w-[195px] max-w-full min-[1080px]:pt-[44px]">
          <h2 className={heading}>Follow us</h2>
          <div className="mt-5"><Social size="sm" /></div>
        </div>
      </div>

      <div className="container-x relative mt-14 lg:mt-[46px]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e6e8ea] pb-10 pt-8">
          <small className="text-base">© 2022 Restaurants. All Right Reserved. Designed by <strong className="text-ink">Isaac</strong></small>
          <ul className="m-0 flex list-none gap-9 p-0">
            <li><a href="#" className="hover:text-orange">Terms of Service</a></li>
            <li><a href="#" className="hover:text-orange">Privacy Policy</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
