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

  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  desktop.addEventListener('change', function (e) {
    if (e.matches) setOpen(false);
  });
})();

(function () {
  const form = document.getElementById('booking-form');
  const status = document.getElementById('bk-status');
  const dateInput = document.getElementById('bk-date');
  const timeSelect = document.getElementById('bk-time');

  function pad(n) { return String(n).padStart(2, '0'); }

  // Giờ nhận đặt bàn: 9:00 - 21:30, mỗi 30 phút
  for (let m = 9 * 60; m <= 21 * 60 + 30; m += 30) {
    const t = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    timeSelect.appendChild(opt);
  }

  function todayString() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  dateInput.min = todayString();

  const rules = {
    name: function (v) { return v.trim() ? '' : 'Vui lòng nhập họ tên.'; },
    phone: function (v) {
      const digits = v.replace(/[\s.\-()]/g, '');
      if (!digits) return 'Vui lòng nhập số điện thoại.';
      return /^(0|\+84)\d{9}$/.test(digits) ? '' : 'Số điện thoại chưa đúng (VD: 0986 187 111).';
    },
    date: function (v) {
      if (!v) return 'Vui lòng chọn ngày.';
      return v >= todayString() ? '' : 'Ngày đặt không được ở quá khứ.';
    },
    time: function (v) { return v ? '' : 'Vui lòng chọn giờ.'; },
    guests: function (v) {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 20 ? '' : 'Số người từ 1 đến 20.';
    },
    note: function (v) { return v.length <= 500 ? '' : 'Ghi chú tối đa 500 ký tự.'; }
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

  const fields = Array.from(form.querySelectorAll('input, select, textarea'));

  fields.forEach(function (f) {
    f.addEventListener('blur', function () { validate(f); });
    f.addEventListener('input', function () {
      if (f.getAttribute('aria-invalid') === 'true') validate(f);
    });
  });

  function showStatus(text, isError) {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
    status.hidden = false;
  }

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

  function send() {
    const button = form.querySelector('button[type="submit"]');
    const label = button.textContent;
    const data = new FormData(form);
    const body = {
      name: data.get('name').trim(),
      phone: data.get('phone').replace(/[\s.\-()]/g, ''),
      booking_date: data.get('date'),
      booking_time: data.get('time'),
      guests: Number(data.get('guests')),
      note: data.get('note').trim() || null
    };

    button.disabled = true;
    button.textContent = 'Đang gửi...';

    fetch(window.SUPABASE_URL + '/rest/v1/bookings', {
      method: 'POST',
      headers: {
        'apikey': window.SUPABASE_KEY,
        'Authorization': 'Bearer ' + window.SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        document.getElementById('bk-guests').value = 2;
        showStatus('Cảm ơn bạn! Quán đã nhận đơn đặt bàn và sẽ liên hệ xác nhận qua số ' + body.phone + '.', false);
      })
      .catch(function () {
        showStatus('Đặt bàn không thành công. Vui lòng thử lại hoặc gọi 0986 187 111.', true);
      })
      .finally(function () {
        button.disabled = false;
        button.textContent = label;
      });
  }
})();
