import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Menu from './components/Menu.jsx';
import Reviews from './components/Reviews.jsx';
import Footer from './components/Footer.jsx';

// App ghép các "component" (mảnh giao diện) lại thành cả trang.
export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Menu />
        <Reviews />
      </main>
      <Footer />
    </>
  );
}
