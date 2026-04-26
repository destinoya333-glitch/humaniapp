import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import Services from "./components/Services";
import AIDemo from "./components/AIDemo";
import Testimonials from "./components/Testimonials";
import Entrepreneurs from "./components/Entrepreneurs";
import Why from "./components/Why";
import FAQ from "./components/FAQ";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Services />
        <AIDemo />
        <Testimonials />
        <Entrepreneurs />
        <Why />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
