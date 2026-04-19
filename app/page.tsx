import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import AIDemo from "./components/AIDemo";
import Services from "./components/Services";
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
        <AIDemo />
        <Services />
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
