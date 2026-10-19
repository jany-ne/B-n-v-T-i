import { useCallback, useEffect, useRef, useState } from 'react';
import { TURNSTILE_SITE_KEY } from '../config.js';

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// Nạp script của Cloudflare đúng một lần cho cả trang.
function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    let script = document.querySelector(`script[src="${SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', reject);
  });
}

// "Hook" tự viết: gói toàn bộ việc dùng Turnstile vào một chỗ để component nào cần cũng dùng lại được.
// Cách dùng: const { ref, token, error, reset } = useTurnstile();  rồi đặt <div ref={ref} /> ở nơi muốn hiện ô xác minh.
export function useTurnstile() {
  const ref = useRef(null);
  const widgetId = useRef(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: 'vi',
          callback: (t) => { setToken(t); setError(''); },
          'expired-callback': () => setToken(''),
          'error-callback': () => { setToken(''); setError('Không tải được xác minh. Vui lòng tải lại trang.'); },
        });
      })
      .catch(() => setError('Không tải được xác minh. Vui lòng tải lại trang.'));

    // Hàm dọn dẹp: chạy khi component biến mất.
    return () => {
      cancelled = true;
      if (widgetId.current !== null && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  const reset = useCallback(() => {
    setToken('');
    if (widgetId.current !== null && window.turnstile) window.turnstile.reset(widgetId.current);
  }, []);

  return { ref, token, error, setError, reset };
}
