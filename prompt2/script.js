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
    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    send();
  });

  function showStatus(text, isError) {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
    status.hidden = false;
  }

  function send() {
    const endpoint = form.dataset.endpoint;
    const button = form.querySelector('button[type="submit"]');
    const label = button.textContent;

    button.disabled = true;
    button.textContent = 'Đang gửi...';

    // Không có endpoint: giả lập gửi thành công
    const request = endpoint
      ? fetch(endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form)
        }).then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
        })
      : Promise.resolve();

    request
      .then(function () {
        form.reset();
        showStatus('Cảm ơn bạn! Bạn & Tôi đã nhận được lời nhắn.', false);
      })
      .catch(function () {
        showStatus('Gửi không thành công. Vui lòng thử lại sau hoặc gọi 0986 187 111.', true);
      })
      .finally(function () {
        button.disabled = false;
        button.textContent = label;
      });
  }
})();
