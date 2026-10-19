import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { api } from '../lib/supabase.js';

// Cùng khóa với trang quản lý bản cũ, nên đăng nhập ở bản nào cũng dùng được ở bản kia (trong cùng một tab).
const STORE = 'booking-admin-session';

function readSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORE));
    return s && s.exp > Date.now() + 30000 ? s.t : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

// "Context": nơi giữ thông tin đăng nhập để mọi component bên dưới dùng được mà không phải truyền qua từng tầng.
export function AuthProvider({ children }) {
  const [token, setToken] = useState(readSession);
  const [notice, setNotice] = useState('');

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('login');
    const data = await res.json();
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ t: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 }));
    } catch {
      // trình duyệt chặn lưu trữ: vẫn đăng nhập được, chỉ không giữ khi tải lại trang
    }
    setNotice('');
    setToken(data.access_token);
  }, []);

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(STORE); } catch { /* bỏ qua */ }
    setToken(null);
  }, []);

  // Gọi Supabase bằng quyền quản lý. Nếu token hết hạn (401) thì tự đăng xuất kèm thông báo.
  const request = useCallback(async (path, options) => {
    const res = await api(path, options, token);
    if (res.status === 401) {
      logout();
      setNotice('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
      throw new Error('expired');
    }
    return res;
  }, [token, logout]);

  const value = useMemo(() => ({ token, notice, login, logout, request }), [token, notice, login, logout, request]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
