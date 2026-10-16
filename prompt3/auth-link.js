// Đổi mục "Login" trên menu thành "Logout" khi đã đăng nhập quản lý.
// Dùng chung cho prompt2 và prompt3 (cùng đọc phiên trong sessionStorage).
(function () {
  const STORE = 'booking-admin-session';
  const link = document.getElementById('auth-link');
  if (!link) return;
  const manage = document.getElementById('manage-item');
  const loginHref = link.getAttribute('href');

  function loggedIn() {
    try {
      const s = JSON.parse(sessionStorage.getItem(STORE));
      return Boolean(s && s.exp > Date.now() + 30000);
    } catch (e) { return false; }
  }

  function refresh() {
    const on = loggedIn();
    link.textContent = on ? 'Logout' : 'Login';
    link.setAttribute('href', on ? '#' : loginHref);
    if (manage) manage.hidden = !on;
  }

  link.addEventListener('click', function (e) {
    if (!loggedIn()) return;
    e.preventDefault();
    try { sessionStorage.removeItem(STORE); } catch (err) {}
    if (document.getElementById('login-form')) window.location.reload();
    else refresh();
  });

  window.refreshAuthLink = refresh;
  refresh();
})();
