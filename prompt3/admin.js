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
    loadMenu();
  }

  function showLogin(message) {
    token = null;
    clearSession();
    if (window.refreshAuthLink) window.refreshAuthLink();
    rows.replaceChildren();
    document.getElementById('menu-rows').replaceChildren();
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


  // ---------- Quản lý menu ----------
  const menuForm = document.getElementById('menu-form');
  const menuRows = document.getElementById('menu-rows');
  const menuStatus = document.getElementById('mn-status');
  const menuSubmit = document.getElementById('mn-submit');
  const menuCancel = document.getElementById('mn-cancel');
  const mn = {
    id: document.getElementById('mn-id'),
    name: document.getElementById('mn-name'),
    desc: document.getElementById('mn-desc'),
    price: document.getElementById('mn-price'),
    image: document.getElementById('mn-image'),
    alt: document.getElementById('mn-alt'),
    sort: document.getElementById('mn-sort'),
    available: document.getElementById('mn-available')
  };
  let menuItems = [];

  function menuMessage(text, isError) {
    menuStatus.textContent = text;
    menuStatus.classList.toggle('is-error', Boolean(isError));
    menuStatus.hidden = !text;
  }

  function resetMenuForm() {
    menuForm.reset();
    mn.id.value = '';
    mn.sort.value = menuItems.length ? Math.max.apply(null, menuItems.map(function (m) { return m.sort; })) + 1 : 1;
    menuSubmit.textContent = 'Thêm món';
    menuCancel.hidden = true;
  }

  function loadMenu() {
    fetch(URL + '/rest/v1/menu_items?select=*&order=sort.asc', { headers: headers() })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (list) {
        menuItems = list;
        menuRows.replaceChildren();
        list.forEach(function (m) {
          const tr = document.createElement('tr');
          tr.append(cell(m.sort), cell(m.name), cell(Number(m.price).toLocaleString('vi-VN') + 'đ'), cell(m.available ? 'Đang bán' : 'Đã ẩn'));
          const td = document.createElement('td');
          const edit = document.createElement('button');
          edit.type = 'button';
          edit.className = 'admin-logout';
          edit.textContent = 'Sửa';
          edit.setAttribute('aria-label', 'Sửa món ' + m.name);
          edit.addEventListener('click', function () { startEdit(m); });
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'admin-delete';
          del.textContent = 'Xóa';
          del.setAttribute('aria-label', 'Xóa món ' + m.name);
          del.addEventListener('click', function () { removeMenu(m); });
          td.append(edit, ' ', del);
          tr.appendChild(td);
          menuRows.appendChild(tr);
        });
        if (!mn.id.value) resetMenuForm();
      })
      .catch(function () { menuMessage('Không tải được menu. Bạn đã chạy supabase-menu.sql chưa?', true); });
  }

  function startEdit(m) {
    mn.id.value = m.id;
    mn.name.value = m.name;
    mn.desc.value = m.description || '';
    mn.price.value = m.price;
    mn.image.value = m.image_url || '';
    mn.alt.value = m.alt_text || '';
    mn.sort.value = m.sort;
    mn.available.checked = m.available;
    menuSubmit.textContent = 'Lưu thay đổi';
    menuCancel.hidden = false;
    menuMessage('', false);
    mn.name.focus();
  }

  menuCancel.addEventListener('click', function () {
    resetMenuForm();
    menuMessage('', false);
  });

  menuForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = mn.name.value.trim();
    const price = Number(mn.price.value);
    if (!name) { menuMessage('Vui lòng nhập tên món.', true); mn.name.focus(); return; }
    if (mn.price.value === '' || !Number.isInteger(price) || price < 0) { menuMessage('Giá phải là số nguyên từ 0 trở lên.', true); mn.price.focus(); return; }

    const body = {
      name: name,
      description: mn.desc.value.trim() || null,
      price: price,
      image_url: mn.image.value.trim() || null,
      alt_text: mn.alt.value.trim() || null,
      sort: Number(mn.sort.value) || 0,
      available: mn.available.checked
    };
    const editing = mn.id.value;
    const path = editing ? '/rest/v1/menu_items?id=eq.' + encodeURIComponent(editing) : '/rest/v1/menu_items';
    menuSubmit.disabled = true;

    fetch(URL + path, {
      method: editing ? 'PATCH' : 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, headers()),
      body: JSON.stringify(body)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        menuMessage(editing ? 'Đã lưu thay đổi.' : 'Đã thêm món.', false);
        mn.id.value = '';
        resetMenuForm();
        loadMenu();
      })
      .catch(function () { menuMessage('Lưu không thành công. Hãy kiểm tra lại thông tin.', true); })
      .finally(function () { menuSubmit.disabled = false; });
  });

  function removeMenu(m) {
    if (!window.confirm('Xóa món "' + m.name + '" khỏi menu?')) return;
    fetch(URL + '/rest/v1/menu_items?id=eq.' + encodeURIComponent(m.id), { method: 'DELETE', headers: headers() })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        menuMessage('Đã xóa món.', false);
        loadMenu();
      })
      .catch(function () { menuMessage('Xóa không thành công.', true); });
  }

  const saved = readSession();
  if (saved) showPanel(saved);
})();
