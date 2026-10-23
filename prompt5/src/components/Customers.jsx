import { useEffect, useRef, useState } from 'react';
import { LOREM_SHORT, REVIEWS, img } from '../data/content.js';

const STARS = [0, 1, 2, 3, 4];

// Slider bằng cuộn ngang có "snap": vuốt/cuộn được, nút chấm bên dưới nhảy tới từng thẻ.
export default function Customers() {
  const track = useRef(null);
  const [active, setActive] = useState(0);

  // Khi cuộn, tìm thẻ gần giữa nhất để đánh dấu chấm đang chọn.
  useEffect(() => {
    const el = track.current;
    const onScroll = () => {
      const middle = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestGap = Infinity;
      [...el.children].forEach((card, i) => {
        const gap = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle);
        if (gap < bestGap) { best = i; bestGap = gap; }
      });
      setActive(best);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  function show(i) {
    track.current.children[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  return (
    <section id="events" aria-labelledby="customers-title" className="relative isolate overflow-hidden bg-mist pt-20 lg:pt-[110px]">
      <img src={img('art_4.png')} width="532" height="931" alt="" aria-hidden="true" loading="lazy" className="pointer-events-none absolute -left-[4px] top-[50px] -z-10 w-[230px] max-w-none sm:w-[340px] lg:top-[85px] lg:w-[532px]" />
      <div className="container-x text-center">
        <h2 id="customers-title" className="m-0 font-serif text-[40px] font-bold leading-tight text-ink lg:text-[60px]">Our Happy Customers</h2>
        <p className="mx-auto mb-0 mt-5 max-w-[400px]">{LOREM_SHORT}</p>
      </div>

      <div
        ref={track}
        role="group"
        aria-roledescription="carousel"
        aria-label="Customer reviews"
        className="mt-24 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-16 pt-14 [scrollbar-width:none] lg:mt-[56px] lg:gap-[116px] lg:px-[calc(50%-320px)] [&::-webkit-scrollbar]:hidden"
      >
        {REVIEWS.map((r, i) => (
          <figure
            key={r.name}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${REVIEWS.length}`}
            className="relative m-0 w-[min(640px,86vw)] shrink-0 snap-center rounded-[40px_40px_70px_30px] bg-white px-8 pb-12 pt-[100px] text-center shadow-[0_24px_50px_-18px_rgba(16,26,36,0.18)] lg:rounded-[60px_60px_100px_40px] lg:px-[130px]"
          >
            {/* alt rỗng: tên người đã có trong figcaption bên dưới nên ảnh chỉ để trang trí.
                Không dùng lazy vì ảnh rất nhẹ và các thẻ nằm ngoài khung nhìn ngang, tránh avatar hiện trống khi chuyển thẻ. */}
            <img src={img(r.avatar)} width="218" height="218" alt="" className="absolute left-1/2 top-0 size-[110px] -translate-x-1/2 -translate-y-1/2 rounded-full object-cover" />
            <div role="img" aria-label="5 out of 5 stars" className="absolute left-1/2 top-[66px] flex -translate-x-1/2 gap-3 text-[#ffb400]">
              {STARS.map((s) => <span key={s} aria-hidden="true" className="text-[22px] leading-none">★</span>)}
            </div>
            <blockquote className="m-0 mt-8"><p className="m-0">{r.text}</p></blockquote>
            <figcaption className="mt-8">
              <strong className="block text-base font-bold text-ink">{r.name}</strong>
              <span className="text-base">{r.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <ul className="m-0 flex list-none justify-center gap-[14px] p-0 pb-8 lg:-mt-6 lg:pt-0">
        {REVIEWS.map((r, i) => (
          <li key={r.name}>
            <button
              type="button"
              aria-label={`Show review ${i + 1}`}
              aria-current={active === i ? 'true' : undefined}
              onClick={() => show(i)}
              className="grid size-6 place-items-center"
            >
              <span className={`block size-2 rounded-full transition ${active === i ? 'bg-orange' : 'bg-[#c9cdd1]'}`} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
