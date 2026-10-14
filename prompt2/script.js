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
