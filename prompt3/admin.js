(function () {
  const URL = window.SUPABASE_URL;
  const KEY = window.SUPABASE_KEY;
  let token = null; // chỉ giữ trong bộ nhớ, tải lại trang là phải đăng nhập lại

  const loginForm = document.getElementById('login-form');
  const loginStatus = document.getElementById('login-status');
  const panel = document.getElementById('panel');
  const panelStatus = document.getElementById('panel-status');
  const rows = document.getElementById('rows');
  const logout = document.getElementById('logout');

  function headers() {
    return { 'apikey': KEY, 'Authorization': 'Bearer ' + (token || KEY) };
  }

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginStatus.hidden = true;
    const button = loginForm.querySelector('button');
    button.disabled = true;

    fetch(URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'apikey': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('ad-email').value.trim(),
        password: document.getElementById('ad-password').value
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('login');
        return res.json();
      })
      .then(function (data) {
        token = data.access_token;
        document.getElementById('ad-password').value = '';
        loginForm.hidden = true;
        panel.hidden = false;
        logout.hidden = false;
        load();
      })
      .catch(function () {
        loginStatus.textContent = 'Email hoặc mật khẩu không đúng.';
        loginStatus.hidden = false;
      })
      .finally(function () { button.disabled = false; });
  });

  logout.addEventListener('click', function () {
    token = null;
    rows.replaceChildren();
    panel.hidden = true;
    logout.hidden = true;
    loginForm.hidden = false;
  });

  function cell(text) {
    const td = document.createElement('td');
    td.textContent = text == null ? '' : text;
    return td;
  }

  function formatDate(iso) {
    const p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function load() {
    panelStatus.textContent = 'Đang tải...';
    fetch(URL + '/rest/v1/bookings?select=*&order=booking_date.asc,booking_time.asc', { headers: headers() })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (list) {
        rows.replaceChildren();
        panelStatus.textContent = list.length ? 'Có ' + list.length + ' đơn đặt bàn.' : 'Chưa có đơn đặt bàn nào.';
        list.forEach(function (b) {
          const tr = document.createElement('tr');
          tr.append(cell(formatDate(b.booking_date)), cell(b.booking_time.slice(0, 5)), cell(b.name), cell(b.phone), cell(b.guests), cell(b.note));

          const td = document.createElement('td');
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'admin-delete';
          del.textContent = 'Xóa';
          del.setAttribute('aria-label', 'Xóa đơn của ' + b.name);
          del.addEventListener('click', function () { remove(b); });
          td.appendChild(del);
          tr.appendChild(td);
          rows.appendChild(tr);
        });
      })
      .catch(function () {
        panelStatus.textContent = 'Không tải được danh sách. Hãy đăng nhập lại bằng đúng tài khoản quản lý.';
      });
  }

  function remove(b) {
    if (!window.confirm('Xóa đơn đặt bàn của ' + b.name + '?')) return;
    fetch(URL + '/rest/v1/bookings?id=eq.' + encodeURIComponent(b.id), { method: 'DELETE', headers: headers() })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        load();
      })
      .catch(function () { panelStatus.textContent = 'Xóa không thành công.'; });
  }
})();
