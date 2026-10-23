import Button from './Button.jsx';
import { LOREM, img } from '../data/content.js';

const POINTS = Array(6).fill('Lorem ipsum dolor sit amet, consectetur');

export default function Chef() {
  return (
    <section id="gallery" aria-labelledby="chef-title" className="relative isolate overflow-hidden bg-white py-20 lg:py-[125px]">
      <img src={img('art_3.png')} width="382" height="304" alt="" aria-hidden="true" loading="lazy" className="pointer-events-none absolute left-0 top-[16px] -z-10 w-[190px] max-w-none sm:w-[280px] lg:top-[30px] lg:w-[382px]" />
      <div className="container-x grid items-center gap-12 lg:grid-cols-2 lg:gap-0">
        <div className="lg:self-stretch lg:pt-[110px]">
          <h2 id="chef-title" className="m-0 font-serif text-[40px] font-bold leading-tight text-ink lg:text-[60px]">Our Expects Chef</h2>
          <p className="mb-0 mt-4 max-w-[380px]">{LOREM}</p>
          <ul className="m-0 mt-8 grid list-none gap-x-6 gap-y-6 p-0 sm:grid-cols-2 lg:mt-[56px] lg:grid-cols-[308px_auto] lg:gap-x-0 lg:gap-y-[42px]">
            {POINTS.map((p, i) => (
              <li key={i} className="flex items-start gap-[10px] text-base leading-[21px]">
                <span aria-hidden="true" className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-orange">
                  <svg width="12" height="9" viewBox="0 0 12 9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4.5 4.2 7.5 11 1" /></svg>
                </span>
                <span className="max-w-[230px]">{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-5 lg:ml-[56px] lg:mt-[48px]">
            <Button variant="dark" className="w-[120px] px-0">Menu</Button>
            <Button>Book a table</Button>
          </div>
        </div>

        <img
          src={img('chef.webp')}
          width="1014"
          height="1390"
          alt="Smiling chef in a white uniform holding a salad plate"
          loading="lazy"
          className="mx-auto block h-auto w-full max-w-[420px] lg:ml-auto lg:mr-0 lg:max-w-[495px]"
        />
      </div>
    </section>
  );
}
