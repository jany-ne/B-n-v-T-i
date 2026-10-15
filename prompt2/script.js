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
    // Chưa có backend: chỉ giả lập gửi thành công
    form.reset();
    status.textContent = 'Cảm ơn bạn! Bean & Bloom đã nhận được lời nhắn.';
    status.hidden = false;
  });
})();
