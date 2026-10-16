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

  const fields = Array.from(form.querySelectorAll('input:not([type="radio"]), select, textarea'));

  // ---------- Chọn bàn ----------
  const tableBox = document.getElementById('bk-tables');
  const tableHint = document.getElementById('bk-table-hint');
  const tableError = document.getElementById('bk-table-error');
  const guestsInput = document.getElementById('bk-guests');
  let tables = [];
  let taken = new Set();
  let requestId = 0;

  function api(path, options) {
    options = options || {};
    options.headers = Object.assign({
      'apikey': window.SUPABASE_KEY,
      'Authorization': 'Bearer ' + window.SUPABASE_KEY,
      'Content-Type': 'application/json'
    }, options.headers);
    return fetch(window.SUPABASE_URL + path, options);
  }

  function selectedTable() {
    const r = tableBox.querySelector('input:checked');
    return r ? r.value : '';
  }

  function renderTables() {
    const keep = selectedTable();
    const guests = Number(guestsInput.value) || 0;
    const ready = dateInput.value && timeSelect.value;
    tableBox.replaceChildren();

    tables.forEach(function (t) {
      const busy = taken.has(t.id);
      const small = t.seats < guests;
      const disabled = !ready || busy || small;

      const label = document.createElement('label');
      label.className = 'table-option' + (disabled ? ' is-disabled' : '');

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'table';
      radio.value = t.id;
      radio.disabled = disabled;
      radio.checked = !disabled && t.id === keep;
      radio.addEventListener('change', function () {
        tableError.hidden = true;
        tableError.textContent = '';
      });

      const name = document.createElement('span');
      name.className = 'table-name';
      name.textContent = t.name + ': ';
      const info = document.createElement('span');
      const showSeats = !ready || (!busy && !small);
      info.className = 'table-info' + (showSeats ? ' table-seats' : '');
      info.textContent = showSeats ? t.seats + ' chỗ' : busy ? 'Đã có người đặt' : 'Không đủ chỗ';

      label.append(radio, name, info);
      tableBox.appendChild(label);
    });

    if (!tables.length) tableHint.textContent = 'Đang tải danh sách bàn...';
    else if (!ready) tableHint.textContent = 'Chọn ngày, giờ và số người để xem bàn trống.';
    else tableHint.textContent = 'Mỗi lượt đặt giữ bàn trong 90 phút.';
  }

  function refreshAvailability() {
    const date = dateInput.value;
    const time = timeSelect.value;
    const id = ++requestId;
    if (!date || !time) {
      taken = new Set();
      renderTables();
      return Promise.resolve();
    }
    return api('/rest/v1/rpc/get_taken_tables', {
      method: 'POST',
      body: JSON.stringify({ p_date: date, p_time: time })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (list) {
        if (id !== requestId) return;
        taken = new Set(list.map(function (r) { return r.table_id; }));
        renderTables();
      })
      .catch(function () {
        if (id !== requestId) return;
        tableHint.textContent = 'Không kiểm tra được bàn trống. Vui lòng tải lại trang.';
      });
  }

  api('/rest/v1/restaurant_tables?select=id,name,seats&order=sort.asc')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (list) {
      tables = list;
      renderTables();
    })
    .catch(function () {
      tableHint.textContent = 'Không tải được danh sách bàn. Vui lòng tải lại trang.';
    });

  dateInput.addEventListener('change', refreshAvailability);
  timeSelect.addEventListener('change', refreshAvailability);
  guestsInput.addEventListener('input', renderTables);
  renderTables();

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
    const noTable = !selectedTable();
    if (noTable) {
      tableError.textContent = 'Vui lòng chọn bàn.';
      tableError.hidden = false;
    }
    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    if (noTable) {
      const first = tableBox.querySelector('input:not(:disabled)');
      if (first) first.focus();
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
      table_id: selectedTable(),
      note: data.get('note').trim() || null
    };

    button.disabled = true;
    button.textContent = 'Đang gửi...';

    api('/rest/v1/bookings', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        if (res.status === 409) {
          refreshAvailability();
          showStatus('Bàn này vừa được người khác đặt. Vui lòng chọn bàn khác.', true);
          return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        guestsInput.value = 2;
        taken = new Set();
        renderTables();
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
