import { Link } from 'react-router-dom';
import { useMenu } from '../hooks/useMenu.js';
import { asset } from '../lib/asset.js';
import { money } from '../data/menu.js';

export default function Menu() {
  const { items } = useMenu();

  return (
    <section id="menu" className="py-12 md:py-16">
      <div className="page-container">
        <h2 className="mb-7 text-center text-2xl font-bold lg:text-3xl">Menu đồ uống</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <article key={it.id} className="flex flex-col overflow-hidden rounded-lg bg-surface shadow">
              {it.image_url && (
                <img
                  src={asset(it.image_url)}
                  alt={it.alt_text || it.name}
                  width="600"
                  height="750"
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover"
                />
              )}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="mb-1 text-lg font-bold">{it.name}</h3>
                {it.description && <p className="mb-3 text-muted">{it.description}</p>}
                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  <span className="font-bold text-primary">{money(it.price)}</span>
                  <Link
                    to={`/dat-mon?mon=${encodeURIComponent(it.id)}`}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-on-accent hover:brightness-110"
                  >
                    Thêm vào giỏ<span className="sr-only"> {it.name}</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
