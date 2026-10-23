import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Dishes from './components/Dishes.jsx';
import Chef from './components/Chef.jsx';
import Customers from './components/Customers.jsx';
import Newsletter from './components/Newsletter.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Dishes />
        <Chef />
        <Customers />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
