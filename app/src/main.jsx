import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

const base = import.meta.env.BASE_URL; // '/' khi chạy trên máy, '/B-n-v-T-i/' khi lên mạng

// Địa chỉ cũ dạng ".../#/dat-ban" tự chuyển sang địa chỉ sạch ".../dat-ban".
if (window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', base + window.location.hash.slice(2));
}

// BrowserRouter: địa chỉ sạch (/dat-ban). "basename" là phần thư mục con của trang trên GitHub Pages.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={base.replace(/\/$/, '')}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
