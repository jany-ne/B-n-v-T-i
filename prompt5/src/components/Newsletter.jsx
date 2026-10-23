import { useState } from 'react';
import { img } from '../data/content.js';

// Banner đăng ký nằm vắt ngang ranh giới giữa nền xám (trên) và nền trắng (dưới).
export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  function submit(e) {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setStatus(ok ? 'Thanks for subscribing!' : 'Please enter a valid email address.');
    if (ok) setEmail('');
  }

  return (
    <div className="bg-[linear-gradient(to_bottom,#f3f4f4_62%,#fff_62%)] pb-4 pt-8 lg:pt-12">
      <section aria-labelledby="news-title" className="container-x">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1a2b36] via-[#2b2a2c] to-[#7a4418] px-5 pb-12 pt-14 text-center lg:rounded-[40px] lg:px-0 lg:pb-[56px] lg:pt-[92px]">
          <img src={img('hero-interior.webp')} width="1032" height="1424" alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 size-full object-cover object-center" />
          <span aria-hidden="true" className="absolute inset-0 bg-ink/40" />
          <h2 id="news-title" className="relative m-0 mx-auto max-w-[700px] font-serif text-[30px] font-bold leading-[1.2] text-white sm:text-[40px] lg:text-[51px]">
            Get Or Promo Code by Subscribing To our Newsletter
          </h2>

          <form onSubmit={submit} noValidate className="relative mx-auto mt-10 flex max-w-[668px] items-center gap-3 rounded-[20px] bg-white p-3 lg:mt-[52px] lg:pl-[10px]">
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              aria-describedby="news-status"
              className="min-w-0 flex-1 bg-transparent px-2 py-3 text-[18px] text-ink placeholder:text-[#8a929a] focus:outline-none"
            />
            <button type="submit" className="h-[57px] shrink-0 rounded-[10px] bg-orange px-6 text-base font-semibold text-white transition hover:brightness-110 lg:px-9">Subscribe</button>
          </form>
          <p id="news-status" role="status" className="relative mb-0 mt-4 min-h-6 text-sm font-medium text-white">{status}</p>
        </div>
      </section>
    </div>
  );
}
