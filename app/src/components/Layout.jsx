import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import Chatbot from './Chatbot.jsx';

// Khung chung của mọi trang: đầu trang, nội dung (thay đổi theo địa chỉ), chân trang, chatbot.
export default function Layout() {
  const location = useLocation();

  // Mỗi lần chuyển trang: cuộn tới phần được yêu cầu, hoặc về đầu trang.
  useEffect(() => {
    const id = location.state?.section;
    if (id) document.getElementById(id)?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [location]);

  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <Chatbot />
    </>
  );
}
