// Kiểm thử bài dựng landing page nhà hàng (prompt5, cổng 8083).
const { test, expect } = require('@playwright/test');

const PAGE = 'http://localhost:8083/';
// Nhóm trang trí của hero (3 vòng tròn SVG + chữ tròn). Không dùng '#top svg' vì icon mạng xã hội cũng là svg.
const DECOR = '#top .container-x > div[aria-hidden="true"]';
const rgb = (page, selector, prop) => page.locator(selector).first().evaluate((el, p) => getComputedStyle(el)[p], prop);

test.describe('desktop 1512px (cỡ frame Figma)', () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test('tiêu đề hero đúng font, cỡ chữ và line-height của thiết kế', async ({ page }) => {
    await page.goto(PAGE);
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveText('We provide the best food for you');
    expect(await h1.evaluate((el) => getComputedStyle(el).fontSize)).toBe('70px');
    expect(await h1.evaluate((el) => getComputedStyle(el).lineHeight)).toBe('72px');
    expect(await h1.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('David Libre');
  });

  test('đoạn văn dùng Inter 16px, line-height 29px', async ({ page }) => {
    await page.goto(PAGE);
    const p = page.locator('#top p').first();
    expect(await p.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
    expect(await p.evaluate((el) => getComputedStyle(el).lineHeight)).toBe('29px');
    expect(await p.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Inter');
  });

  test('màu nút và nền khối khớp mã màu trong Figma', async ({ page }) => {
    await page.goto(PAGE);
    expect(await rgb(page, 'main a:has-text("Book a table")', 'backgroundColor')).toBe('rgb(234, 109, 39)'); // #EA6D27
    expect(await rgb(page, 'main a:has-text("Menu")', 'backgroundColor')).toBe('rgb(16, 26, 36)'); // #101A24
    expect(await rgb(page, '#dishes', 'backgroundColor')).toBe('rgb(243, 244, 244)'); // #F3F4F4
    expect(await rgb(page, '#top p', 'color')).toBe('rgb(92, 101, 116)'); // #5C6574, màu chữ đoạn văn
  });

  test('nút Menu và Book a table bo góc không đều: trên-trái và dưới-phải bo, hai góc kia gần vuông', async ({ page }) => {
    await page.goto(PAGE);
    for (const selector of ['main a:has-text("Menu")', 'main a:has-text("Book a table")', 'header a:has-text("Book a table")']) {
      const r = await page.locator(selector).first().evaluate((el) => {
        const c = getComputedStyle(el);
        return [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius];
      });
      expect(r, selector).toEqual(['15px', '2px', '15px', '2px']);
    }
  });

  test('kích thước nút khớp thiết kế: cao 54px, Menu rộng 120px, Book a table rộng 167px', async ({ page }) => {
    await page.goto(PAGE);
    await page.evaluate(() => document.fonts.ready); // chờ font tải xong, nếu không chữ dùng font dự phòng rộng hơn
    const menu = await page.locator('#top a:has-text("Menu")').first().boundingBox();
    const book = await page.locator('#top a:has-text("Book a table")').first().boundingBox();
    expect([menu.width, menu.height]).toEqual([120, 54]);
    expect([Math.round(book.width), book.height]).toEqual([167, 54]);
  });

  test('nút Subscribe vẫn bo đều bốn góc như thiết kế', async ({ page }) => {
    await page.goto(PAGE);
    const r = await page.getByRole('button', { name: 'Subscribe' }).evaluate((el) => {
      const c = getComputedStyle(el);
      return [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius];
    });
    expect(new Set(r).size).toBe(1);
  });

  test('trang trí hero: 3 vòng tròn SVG đầy đủ và chữ tròn DELICIOSE FOODS, không gây cuộn ngang', async ({ page }) => {
    await page.goto(PAGE);
    const svg = page.locator(`${DECOR} svg`);
    await expect(svg.locator('circle')).toHaveCount(3);
    const radii = await svg.locator('circle').evaluateAll((cs) => cs.map((c) => c.getAttribute('r')));
    expect(radii).toEqual(['480', '480', '480']); // cùng bán kính như đo từ ảnh Figma
    const badge = page.locator('#top img[src$="hero-badge.webp"]');
    await expect(badge).toBeVisible();
    const box = await badge.boundingBox();
    // Ảnh chữ tròn có lề 2px quanh nét chữ, nên nét chữ nằm ở (119, 264) như thiết kế: ảnh ở (117, 262)
    expect([Math.round(box.x) + 2, Math.round(box.y) + 2]).toEqual([119, 264]);
    await expect(svg.locator('xpath=..')).toHaveAttribute('aria-hidden', 'true');
    const widths = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(widths[0]).toBe(widths[1]);
  });

  test('nền khối xám trải full width, nội dung bên trong rộng tối đa 1152px', async ({ page }) => {
    await page.goto(PAGE);
    const section = await page.locator('#dishes').boundingBox();
    const inner = await page.locator('#dishes > .container-x').first().boundingBox();
    expect(section.width).toBe(1512);
    expect(inner.width).toBe(1152);
    expect(inner.x).toBe(180); // lề trái 180px như thiết kế
  });

  test('màn hình rộng hơn (1920px): nền vẫn full width, nội dung vẫn 1152px và căn giữa', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.goto(PAGE);
    const section = await page.locator('#dishes').boundingBox();
    const inner = await page.locator('#dishes > .container-x').first().boundingBox();
    expect(section.width).toBe(1920);
    expect(inner.width).toBe(1152);
    expect(inner.x).toBe(384);
  });

  test('menu chính hiện ngang, không có nút hamburger', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveText(['Menu', 'Events', 'Gallery', 'About', 'Contact']);
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
  });

  test('4 món nằm trên một hàng', async ({ page }) => {
    await page.goto(PAGE);
    const items = page.locator('#dishes ul > li');
    await expect(items).toHaveCount(4);
    const tops = await items.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });

  test('đĩa món ăn đè lên góc dưới trái của ảnh hero', async ({ page }) => {
    await page.goto(PAGE);
    const photo = await page.getByRole('img', { name: /Restaurant interior/ }).boundingBox();
    const plate = await page.getByRole('img', { name: /Papaya salad/ }).first().boundingBox();
    expect(plate.x).toBeLessThan(photo.x); // nhô ra phía trái ảnh
    expect(plate.y + plate.height).toBeLessThan(photo.y + photo.height); // nhưng nằm trong chiều cao ảnh
    expect(plate.y + plate.height).toBeGreaterThan(photo.y + photo.height - 80);
  });

  test('banner đăng ký vắt ngang ranh giới giữa nền xám và nền trắng', async ({ page }) => {
    await page.goto(PAGE);
    const section = page.locator('#news-title').locator('xpath=ancestor::section');
    const banner = await section.boundingBox();
    const wrapper = await section.locator('xpath=..').boundingBox();
    // Vùng bao quanh có nền xám ở 62% phía trên, trắng ở phần còn lại (xem Newsletter.jsx)
    const boundary = wrapper.y + wrapper.height * 0.62;
    expect(banner.y).toBeLessThan(boundary);
    expect(banner.y + banner.height).toBeGreaterThan(boundary);
  });
});

test.describe('chữ tròn trang trí đi theo nội dung khi đổi độ rộng', () => {
  async function measure(page) {
    return page.evaluate(() => {
      const circle = document.querySelector('#top img[src$="hero-badge.webp"]').getBoundingClientRect();
      const q = (sel) => document.querySelector(sel).getBoundingClientRect();
      const hit = (b) => circle.left < b.right && circle.right > b.left && circle.top < b.bottom && circle.bottom > b.top;
      const container = q('#top .container-x');
      const h1 = q('h1');
      return {
        circleLeft: Math.round(circle.left),
        h1Left: Math.round(h1.left),
        containerLeft: Math.round(container.left),
        overlaps: [hit(h1), hit(q('header img')), hit(q('header nav')), hit(q('#top p'))],
        scrollW: document.documentElement.scrollWidth,
        viewW: window.innerWidth,
      };
    });
  }

  for (const width of [1024, 1152, 1280, 1366, 1440, 1512, 1728, 1920, 2560]) {
    test(`${width}px: chữ tròn không đè lên tiêu đề, logo, menu, đoạn văn và không cuộn ngang`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(PAGE);
      const m = await measure(page);
      expect(m.overlaps).toEqual([false, false, false, false]);
      expect(m.scrollW).toBe(m.viewW);
      expect(m.circleLeft + 2).toBeGreaterThanOrEqual(20); // nét chữ không bị cắt ra ngoài mép màn hình (ảnh có lề 2px)
    });
  }

  for (const width of [1366, 1440, 1512, 1728, 1920, 2560]) {
    test(`${width}px: chữ tròn luôn cách lề trái của tiêu đề 61px như thiết kế`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(PAGE);
      const m = await measure(page);
      expect(m.h1Left - (m.circleLeft + 2)).toBe(61); // đo từ nét chữ (ảnh có lề 2px)
    });
  }

  for (const width of [1024, 1100, 1280, 1920]) {
    test(`${width}px: không bị cuộn ngang ngay khi trang vừa tải xong (chưa chờ font)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(PAGE); // goto chờ sự kiện load, lúc này font web có thể chưa tải: chữ dự phòng rộng hơn
      const widths = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(widths[0]).toBe(widths[1]);
    });
  }

  test('màn hình hẹp (1024px): chữ tròn dừng ở lề 20px thay vì bị cắt', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto(PAGE);
    expect((await measure(page)).circleLeft + 2).toBe(20);
  });
});

test.describe('slider khách hàng', () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test('có 6 chấm; bấm chấm thứ 3 thì cuộn tới thẻ thứ 3 và đánh dấu đang chọn', async ({ page }) => {
    await page.goto(PAGE);
    const dots = page.getByRole('button', { name: /Show review/ });
    await expect(dots).toHaveCount(6);
    await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');
    await dots.nth(2).click();
    await expect(dots.nth(2)).toHaveAttribute('aria-current', 'true');
    await expect(dots.nth(0)).not.toHaveAttribute('aria-current', 'true');
    const card = page.getByRole('group', { name: '3 of 6' });
    await expect(card).toBeInViewport({ ratio: 0.9 });
  });

  test('có vùng carousel và thẻ được gắn nhãn cho trình đọc màn hình', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByRole('group', { name: 'Customer reviews' })).toBeVisible();
    await expect(page.getByRole('group', { name: '1 of 6' })).toBeVisible();
    await expect(page.getByRole('img', { name: '5 out of 5 stars' }).first()).toBeVisible();
  });
});

test.describe('bản tin đăng ký', () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test('email sai thì báo lỗi, email đúng thì cảm ơn và xóa ô nhập', async ({ page }) => {
    await page.goto(PAGE);
    const input = page.getByLabel('Email');
    await input.fill('khong-phai-email');
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'valid email' })).toBeVisible();
    await input.fill('khach@quan.test');
    await page.getByRole('button', { name: 'Subscribe' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Thanks for subscribing' })).toBeVisible();
    await expect(input).toHaveValue('');
  });
});

test.describe('mobile 375px (tự thiết kế vì Figma không có bản SP)', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('ảnh trang trí hero bị ẩn trên mobile', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.locator('#top img[src$="hero-badge.webp"]')).toBeHidden();
    await expect(page.locator(DECOR)).toBeHidden();
  });

  test('không bị cuộn ngang', async ({ page }) => {
    await page.goto(PAGE);
    const widths = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(widths[0]).toBe(widths[1]);
  });

  test('header chỉ có logo và hamburger, không có menu ngang và nút Book a table', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
    await expect(page.locator('header').getByRole('link', { name: 'Book a table' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  });

  test('hamburger mở và đóng menu, cập nhật aria-expanded', async ({ page }) => {
    await page.goto(PAGE);
    const open = page.getByRole('button', { name: 'Open menu' });
    await expect(open).toHaveAttribute('aria-expanded', 'false');
    await open.click();
    const close = page.getByRole('button', { name: 'Close menu' });
    await expect(close).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Gallery' })).toBeVisible();
    await close.click();
    await expect(page.getByRole('navigation', { name: 'Mobile' })).toHaveCount(0);
  });

  test('các món xếp thành một cột', async ({ page }) => {
    await page.goto(PAGE);
    const lefts = await page.locator('#dishes ul > li').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
    expect(new Set(lefts).size).toBe(1);
  });

  test('cỡ chữ tiêu đề hero nhỏ hơn bản desktop', async ({ page }) => {
    await page.goto(PAGE);
    const size = await page.getByRole('heading', { level: 1 }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeLessThan(70);
  });
});

test.describe('ảnh thật', () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test('mọi ảnh đều tải được (không bị hỏng) và có alt', async ({ page }) => {
    await page.goto(PAGE);
    await page.evaluate(async () => {
      // Cuộn hết trang để các ảnh loading="lazy" được tải
      for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
    });
    // Chờ mọi ảnh tải xong (thành công hoặc lỗi), rồi mới kiểm tra ảnh nào bị hỏng
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 });
    const broken = await page.locator('img').evaluateAll((imgs) => imgs.filter((i) => i.naturalWidth === 0).map((i) => i.src));
    expect(broken).toEqual([]);
    const noAlt = await page.locator('img:not([alt])').count();
    expect(noAlt).toBe(0);
  });

  test('có đủ ảnh món, đầu bếp và đĩa; ảnh có width/height để trang không bị giật', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByRole('img', { name: /spring rolls/ })).toHaveCount(1);
    await expect(page.getByRole('img', { name: /fish fillet/ })).toHaveCount(1);
    await expect(page.getByRole('img', { name: /fried tofu/i })).toHaveCount(1);
    await expect(page.getByRole('img', { name: /fried egg/ })).toHaveCount(1);
    await expect(page.getByRole('img', { name: /chef/i })).toHaveCount(1);
    const missingSize = await page.locator('main img').evaluateAll((imgs) => imgs.filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).length);
    expect(missingSize).toBe(0);
  });

  test('ảnh hero là ảnh quan trọng nhất: tải sớm (fetchpriority=high)', async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByRole('img', { name: /Restaurant interior/ })).toHaveAttribute('fetchpriority', 'high');
  });

  test('logo là ảnh SVG xuất từ Figma ở cả header và footer, bấm vào thì về đầu trang', async ({ page }) => {
    await page.goto(PAGE);
    const logos = page.getByRole('link', { name: /restaurant, back to top/ });
    await expect(logos).toHaveCount(2);
    await expect(logos.first().locator('img')).toHaveAttribute('src', /logo\.svg$/);
    await expect(logos.first()).toHaveAttribute('href', '#top');
  });

  test('mỗi thẻ khách hàng có ảnh avatar tròn, đã tải được', async ({ page }) => {
    await page.goto(PAGE);
    const avatars = page.locator('figure img[src*="avatar"]');
    await expect(avatars).toHaveCount(6);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    });
    const radius = await avatars.first().evaluate((el) => getComputedStyle(el).borderRadius);
    expect(parseFloat(radius)).toBeGreaterThan(50);
    expect(await avatars.evaluateAll((els) => els.filter((e) => e.naturalWidth === 0).length)).toBe(0);
  });
});
