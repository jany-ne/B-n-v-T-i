(function () {
  const URL = window.SUPABASE_URL;
  const KEY = window.SUPABASE_KEY;
  const STORE = 'booking-admin-session';
  let token = null;

  // Phiên đăng nhập lưu trong sessionStorage: tải lại trang vẫn còn, đóng tab là mất
  function saveSession(t, expiresIn) {
    try { sessionStorage.setItem(STORE, JSON.stringify({ t: t, exp: Date.now() + expiresIn * 1000 })); } catch (e) {}
  }
  function clearSession() {
    try { sessionStorage.removeItem(STORE); } catch (e) {}
  }
  function readSession() {
    try {
      const s = JSON.parse(sessionStorage.getItem(STORE));
      return s && s.exp > Date.now() + 30000 ? s.t : null;
    } catch (e) { return null; }
  }

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
        saveSession(data.access_token, data.expires_in || 3600);
        document.getElementById('ad-password').value = '';
        showPanel(data.access_token);
        if (window.refreshAuthLink) window.refreshAuthLink();
      })
      .catch(function () {
        loginStatus.textContent = 'Email hoặc mật khẩu không đúng.';
        loginStatus.hidden = false;
      })
      .finally(function () { button.disabled = false; });
  });

  function showPanel(t) {
    token = t;
    loginForm.hidden = true;
    panel.hidden = false;
    load();
  }

  function showLogin(message) {
    token = null;
    clearSession();
    if (window.refreshAuthLink) window.refreshAuthLink();
    rows.replaceChildren();
    panel.hidden = true;
    loginForm.hidden = false;
    if (message) {
      loginStatus.textContent = message;
      loginStatus.hidden = false;
    }
  }

  logout.addEventListener('click', function () {
    clearSession();
    if (window.refreshAuthLink) window.refreshAuthLink();
    token = null;
    rows.replaceChildren();
    panel.hidden = true;
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
    fetch(URL + '/rest/v1/bookings?select=*,restaurant_tables(name)&order=booking_date.asc,booking_time.asc', { headers: headers() })
      .then(function (res) {
        if (res.status === 401) { showLogin('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'); throw new Error('expired'); }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (list) {
        rows.replaceChildren();
        panelStatus.textContent = list.length ? 'Có ' + list.length + ' đơn đặt bàn.' : 'Chưa có đơn đặt bàn nào.';
        list.forEach(function (b) {
          const tr = document.createElement('tr');
          tr.append(cell(formatDate(b.booking_date)), cell(b.booking_time.slice(0, 5)), cell(b.restaurant_tables ? b.restaurant_tables.name + ':' : ''), cell(b.name), cell(b.phone), cell(b.guests), cell(b.note));

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
      .catch(function (err) {
        if (err.message === 'expired') return;
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

  const saved = readSession();
  if (saved) showPanel(saved);
})();
