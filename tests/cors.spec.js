// Kiểm tra cả ba Edge Function (book, contact, chat) cho phép đúng các trang được phép gọi.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { test, expect } = require('@playwright/test');

function load(name) {
  const source = fs.readFileSync(path.join(__dirname, `../prompt3/supabase-function/${name}.ts`), 'utf8');
  const js = esbuild.transformSync(source, { loader: 'ts' }).code;
  let handler;
  const Deno = { serve: (fn) => { handler = fn; }, env: { get: () => '' } };
  new Function('Deno', 'fetch', js)(Deno, async () => new Response('{}'));
  return handler;
}

for (const name of ['book', 'contact', 'chat', 'order']) {
  const preflight = (origin) => load(name)(new Request(`https://x.test/functions/v1/${name}`, {
    method: 'OPTIONS', headers: origin ? { Origin: origin } : {},
  }));

  test(`${name}: cho phép trang thật jany-ne.github.io`, async () => {
    const res = await preflight('https://jany-ne.github.io');
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://jany-ne.github.io');
  });

  test(`${name}: cho phép localhost:5173 khi phát triển trên máy`, async () => {
    const res = await preflight('http://localhost:5173');
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    expect(res.headers.get('vary')).toBe('Origin');
  });

  test(`${name}: trang lạ không được cấp quyền`, async () => {
    for (const origin of ['https://trang-la.example', 'http://localhost:9999', 'https://jany-ne.github.io.evil.com']) {
      const res = await preflight(origin);
      expect(res.headers.get('access-control-allow-origin')).not.toBe(origin);
    }
  });

  test(`${name}: câu trả lời thường cũng có đúng tiêu đề CORS`, async () => {
    const res = await load(name)(new Request(`https://x.test/functions/v1/${name}`, {
      method: 'POST', headers: { Origin: 'http://localhost:5173' }, body: 'không phải json',
    }));
    expect(res.status).toBe(400);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });
}
