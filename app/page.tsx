import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import AIDemo from "./components/AIDemo";
import Services from "./components/Services";
import Entrepreneurs from "./components/Entrepreneurs";
import Why from "./components/Why";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <AIDemo />
        <Services />
        <Entrepreneurs />
        <Why />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
