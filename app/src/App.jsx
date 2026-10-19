import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import BookingPage from './pages/BookingPage.jsx';

// Bảng chỉ đường: địa chỉ nào hiện trang nào. Layout bọc quanh tất cả các trang.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dat-ban" element={<BookingPage />} />
        <Route path="*" element={<HomePage />} />
      </Route>
    </Routes>
  );
}
