import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import HowItWorks from "./components/HowItWorks";
import Services from "./components/Services";
import AIDemo from "./components/AIDemo";
import Testimonials from "./components/Testimonials";
import Entrepreneurs from "./components/Entrepreneurs";
import Why from "./components/Why";
import FAQ from "./components/FAQ";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import SmoothScroll from "./_design/SmoothScroll";
import { WebSiteSchema, FaqSchema } from "./components/SchemaOrg";
import { faqs } from "./components/faq-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "https://activosya.com" },
};

export default function Home() {
  return (
    <div className="aurum">
      <WebSiteSchema />
      <FaqSchema items={faqs} />
      <SmoothScroll />
      <Navbar />
      <main>
        <Hero />
        <Marquee />
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
    </div>
  );
}
