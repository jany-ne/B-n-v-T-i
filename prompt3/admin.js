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

  // ---------- Upload ảnh món ----------
  const imgFile = document.getElementById('mn-file');
  const imgPreview = document.getElementById('mn-preview');
  const imgRemove = document.getElementById('mn-remove-image');
  const imgStatus = document.getElementById('mn-image-status');
  let uploading = false;

  // Đường dẫn cũ dạng "images/x.jpg" nằm trong thư mục prompt2
  function previewSrc(u) {
    if (!u) return '';
    return /^https?:/.test(u) ? u : '../prompt2/' + u;
  }

  function setImage(u) {
    if (!u) recrop.hidden = true;
    mn.image.value = u || '';
    const src = previewSrc(u);
    imgPreview.hidden = !src;
    if (src) imgPreview.src = src; else imgPreview.removeAttribute('src');
    imgRemove.hidden = !src;
  }

  // ---------- Cắt ảnh theo khung 4:5 (giống khung hiển thị trên trang chủ) ----------
  const cropper = document.getElementById('mn-cropper');
  const cropCanvas = document.getElementById('mn-crop-canvas');
  const cropZoom = document.getElementById('mn-crop-zoom');
  const cropOk = document.getElementById('mn-crop-ok');
  const cropCancel = document.getElementById('mn-crop-cancel');
  const recrop = document.getElementById('mn-recrop');
  const cctx = cropCanvas.getContext('2d');
  const CW = cropCanvas.width;
  const CH = cropCanvas.height;
  let bmp = null;
  let base = 1;
  let zoom = 1;
  let ox = 0;
  let oy = 0;

  function clampCrop() {
    const w = bmp.width * base * zoom;
    const h = bmp.height * base * zoom;
    ox = Math.min(0, Math.max(CW - w, ox));
    oy = Math.min(0, Math.max(CH - h, oy));
  }

  function drawCrop() {
    cctx.fillStyle = '#fff';
    cctx.fillRect(0, 0, CW, CH);
    cctx.drawImage(bmp, ox, oy, bmp.width * base * zoom, bmp.height * base * zoom);
  }

  function openCropper(b) {
    bmp = b;
    base = Math.max(CW / b.width, CH / b.height);
    zoom = 1;
    cropZoom.value = 1;
    ox = (CW - b.width * base) / 2;
    oy = (CH - b.height * base) / 2;
    clampCrop();
    drawCrop();
    cropper.hidden = false;
    recrop.hidden = true;
    cropCanvas.focus();
  }

  cropZoom.addEventListener('input', function () {
    // Phóng to quanh tâm khung
    const old = base * zoom;
    const cx = (CW / 2 - ox) / old;
    const cy = (CH / 2 - oy) / old;
    zoom = Number(cropZoom.value);
    const now = base * zoom;
    ox = CW / 2 - cx * now;
    oy = CH / 2 - cy * now;
    clampCrop();
    drawCrop();
  });

  let drag = null;
  cropCanvas.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY, ox: ox, oy: oy };
    cropCanvas.setPointerCapture(e.pointerId);
  });
  cropCanvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    const k = CW / cropCanvas.getBoundingClientRect().width;
    ox = drag.ox + (e.clientX - drag.x) * k;
    oy = drag.oy + (e.clientY - drag.y) * k;
    clampCrop();
    drawCrop();
  });
  function endDrag() { drag = null; }
  cropCanvas.addEventListener('pointerup', endDrag);
  cropCanvas.addEventListener('pointercancel', endDrag);

  cropCanvas.addEventListener('keydown', function (e) {
    const step = 10;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!move) return;
    e.preventDefault();
    ox += move[0];
    oy += move[1];
    clampCrop();
    drawCrop();
  });

  function closeCropper() {
    cropper.hidden = true;
    imgFile.value = '';
  }

  cropCancel.addEventListener('click', function () {
    closeCropper();
    recrop.hidden = !bmp || !mn.image.value;
  });

  recrop.addEventListener('click', function () { if (bmp) openCropper(bmp); });

  function uploadBlob(blob) {
    uploading = true;
    menuSubmit.disabled = true;
    imgStatus.textContent = 'Đang tải ảnh lên...';
    const name = (window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now())) + '.jpg';
    return fetch(URL + '/storage/v1/object/menu-images/' + name, {
      method: 'POST',
      headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'image/jpeg', 'x-upsert': 'false' },
      body: blob
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        setImage(URL + '/storage/v1/object/public/menu-images/' + name);
        imgStatus.textContent = 'Đã tải ảnh lên.';
        recrop.hidden = false;
      })
      .catch(function () {
        imgStatus.textContent = 'Tải ảnh không thành công. Bạn đã chạy supabase-storage.sql chưa?';
      })
      .finally(function () {
        uploading = false;
        menuSubmit.disabled = false;
      });
  }

  cropOk.addEventListener('click', function () {
    const out = document.createElement('canvas');
    out.width = 600;
    out.height = 750;
    const k = out.width / CW;
    const octx = out.getContext('2d');
    octx.fillStyle = '#fff';
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(bmp, ox * k, oy * k, bmp.width * base * zoom * k, bmp.height * base * zoom * k);
    cropper.hidden = true;
    imgFile.value = '';
    out.toBlob(function (blob) {
      if (!blob) { imgStatus.textContent = 'Không xử lý được ảnh.'; return; }
      uploadBlob(blob);
    }, 'image/jpeg', 0.85);
  });

  imgFile.addEventListener('change', function () {
    const file = imgFile.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { imgStatus.textContent = 'Chỉ nhận ảnh JPG, PNG hoặc WebP.'; imgFile.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { imgStatus.textContent = 'Ảnh quá lớn (tối đa 10MB).'; imgFile.value = ''; return; }
    imgStatus.textContent = '';
    createImageBitmap(file)
      .then(openCropper)
      .catch(function () { imgStatus.textContent = 'Không đọc được ảnh này.'; imgFile.value = ''; });
  });

  imgRemove.addEventListener('click', function () {
    setImage('');
    recrop.hidden = true;
    imgStatus.textContent = '';
  });

  function menuMessage(text, isError) {
    menuStatus.textContent = text;
    menuStatus.classList.toggle('is-error', Boolean(isError));
    menuStatus.hidden = !text;
  }

  function resetMenuForm() {
    menuForm.reset();
    mn.id.value = '';
    cropper.hidden = true;
    bmp = null;
    setImage('');
    imgStatus.textContent = '';
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
    cropper.hidden = true;
    bmp = null;
    setImage(m.image_url);
    recrop.hidden = true;
    imgStatus.textContent = '';
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
    if (uploading) { menuMessage('Ảnh đang được tải lên, vui lòng đợi.', true); return; }
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
