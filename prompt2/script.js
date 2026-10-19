(function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  const desktop = window.matchMedia('(min-width: 1024px)');

  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
  }

  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // Đóng menu khi bấm vào một liên kết
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  // Đóng menu khi nhấn Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  // Reset trạng thái khi chuyển sang desktop
  desktop.addEventListener('change', function (e) {
    if (e.matches) setOpen(false);
  });
})();

(function () {
  const form = document.getElementById('contact-form');
  const status = document.getElementById('cf-status');

  const rules = {
    name: function (v) { return v.trim() ? '' : 'Vui lòng nhập họ tên.'; },
    email: function (v) {
      if (!v.trim()) return 'Vui lòng nhập email.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Email chưa đúng định dạng.';
    },
    phone: function (v) {
      const digits = v.replace(/[\s.\-()]/g, '');
      if (!digits) return 'Vui lòng nhập số điện thoại.';
      return /^(0|\+84)\d{9}$/.test(digits) ? '' : 'Số điện thoại chưa đúng (VD: 0900 000 000).';
    },
    message: function (v) { return v.trim().length >= 10 ? '' : 'Lời nhắn cần ít nhất 10 ký tự.'; }
  };

  function validate(input) {
    const error = document.getElementById(input.id + '-error');
    const msg = rules[input.name](input.value);
    error.textContent = msg;
    error.hidden = !msg;
    input.setAttribute('aria-invalid', String(Boolean(msg)));
    if (msg) input.setAttribute('aria-describedby', error.id);
    else input.removeAttribute('aria-describedby');
    return !msg;
  }

  const fields = Array.from(form.querySelectorAll('input, textarea'));

  fields.forEach(function (f) {
    f.addEventListener('blur', function () { validate(f); });
    f.addEventListener('input', function () {
      if (f.getAttribute('aria-invalid') === 'true') validate(f);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.hidden = true;
    const invalid = fields.filter(function (f) { return !validate(f); });
    if (!captchaToken) showCaptcha('Vui lòng xác minh bạn không phải robot.');
    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    if (!captchaToken) return;
    send();
  });

  function showStatus(text, isError) {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
    status.hidden = false;
  }

  // ---------- Captcha (Cloudflare Turnstile) ----------
  const captchaError = document.getElementById('cf-captcha-error');
  let widgetId = null;
  let captchaToken = '';

  function showCaptcha(msg) {
    captchaError.textContent = msg;
    captchaError.hidden = !msg;
  }

  function resetCaptcha() {
    captchaToken = '';
    if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
  }

  function renderCaptcha() {
    if (!window.turnstile) { window.setTimeout(renderCaptcha, 200); return; }
    widgetId = window.turnstile.render('#cf-captcha', {
      sitekey: window.TURNSTILE_SITE_KEY,
      language: 'vi',
      callback: function (t) { captchaToken = t; showCaptcha(''); },
      'expired-callback': function () { captchaToken = ''; },
      'error-callback': function () { captchaToken = ''; showCaptcha('Không tải được xác minh. Vui lòng tải lại trang.'); }
    });
  }
  renderCaptcha();

  function send() {
    const button = form.querySelector('button[type="submit"]');
    const label = button.textContent;
    const data = new FormData(form);

    button.disabled = true;
    button.textContent = 'Đang gửi...';

    fetch(window.SUPABASE_URL + '/functions/v1/contact', {
      method: 'POST',
      headers: {
        'apikey': window.SUPABASE_KEY,
        'Authorization': 'Bearer ' + window.SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: captchaToken,
        contact: {
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          message: data.get('message')
        }
      })
    })
      .then(function (res) {
        if (res.status === 400) {
          return res.json().catch(function () { return {}; }).then(function (r) {
            if (r.error === 'captcha') showStatus('Xác minh không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.', true);
            else showStatus('Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.', true);
          });
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        showStatus('Cảm ơn bạn! Bạn & Tôi đã nhận được lời nhắn.', false);
      })
      .catch(function () {
        showStatus('Gửi không thành công. Vui lòng thử lại sau hoặc gọi 0986 187 111.', true);
      })
      .finally(function () {
        resetCaptcha();
        button.disabled = false;
        button.textContent = label;
      });
  }
})();

(function () {
  // Menu đọc từ Supabase. Nếu lỗi, giữ nguyên menu có sẵn trong HTML.
  const grid = document.querySelector('.menu-grid');
  if (!grid || !window.SUPABASE_URL) return;

  fetch(window.SUPABASE_URL + '/rest/v1/menu_items?select=*&available=eq.true&order=sort.asc', {
    headers: { 'apikey': window.SUPABASE_KEY, 'Authorization': 'Bearer ' + window.SUPABASE_KEY }
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (items) {
      if (!items.length) return;
      grid.replaceChildren();
      items.forEach(function (it) {
        const card = document.createElement('article');
        card.className = 'card';
        if (it.image_url) {
          const img = document.createElement('img');
          img.src = it.image_url;
          img.alt = it.alt_text || it.name;
          img.width = 600;
          img.height = 750;
          img.loading = 'lazy';
          card.appendChild(img);
        }
        const body = document.createElement('div');
        body.className = 'card-body';
        const h3 = document.createElement('h3');
        h3.textContent = it.name;
        body.appendChild(h3);
        if (it.description) {
          const p = document.createElement('p');
          p.textContent = it.description;
          body.appendChild(p);
        }
        const price = document.createElement('span');
        price.className = 'price';
        price.textContent = Number(it.price).toLocaleString('vi-VN') + 'đ';
        body.appendChild(price);
        card.appendChild(body);
        grid.appendChild(card);
      });
    })
    .catch(function () {});
})();
