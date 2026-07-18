/**
 * Structured data (JSON-LD) for ActivosYA / EcoDrive+.
 *
 * Per the Next.js guidance, JSON-LD must be rendered as a NATIVE <script> tag
 * inside Server Components so it lands in the static HTML — that is what search
 * engines and generative engines (ChatGPT, Perplexity, Gemini, AI Overviews)
 * actually read. We deliberately do NOT use next/script here: next/script
 * injects after hydration, leaving the raw HTML without any structured data.
 *
 * The `< -> <` replacement prevents `</script>` / XSS breakouts.
 */

import type { Faq } from "./faq-data";

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** Global publisher identity — rendered in the root layout. */
export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": "https://activosya.com/#organization",
        name: "ActivosYA",
        legalName: "EcoDrive Plus SAC",
        url: "https://activosya.com",
        logo: "https://activosya.com/activosya-logo.jpg",
        image: "https://activosya.com/activosya-logo.jpg",
        description:
          "Marketplace de activos digitales en LATAM. Plataformas SaaS llave-en-mano con flujo de caja verificado.",
        foundingDate: "2026",
        address: {
          "@type": "PostalAddress",
          addressCountry: "PE",
          addressLocality: "Trujillo",
          addressRegion: "La Libertad",
        },
        areaServed: [
          { "@type": "Country", name: "Perú" },
          { "@type": "Country", name: "México" },
          { "@type": "Country", name: "Colombia" },
          { "@type": "Country", name: "Chile" },
        ],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "sales",
          email: "destinoya333@gmail.com",
          availableLanguage: ["es"],
        },
        sameAs: ["https://www.facebook.com/Destinoya.pe"],
      }}
    />
  );
}

/** WebSite entity — enables sitelinks / brand entity resolution. */
export function WebSiteSchema(props?: { name?: string; url?: string }) {
  const url = props?.url ?? "https://activosya.com";
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${url}/#website`,
        name: props?.name ?? "ActivosYA",
        url,
        inLanguage: "es-PE",
        publisher: { "@id": "https://activosya.com/#organization" },
      }}
    />
  );
}

export function ServiceSchema(props: {
  name: string;
  description: string;
  url: string;
  priceLabel?: string;
  rentalPriceMin?: number;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: props.name,
        description: props.description,
        url: props.url,
        provider: { "@id": "https://activosya.com/#organization" },
        areaServed: { "@type": "Country", name: "Perú" },
        ...(props.rentalPriceMin
          ? {
              offers: {
                "@type": "Offer",
                priceCurrency: "PEN",
                price: props.rentalPriceMin,
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  priceType: "https://schema.org/Rental",
                  unitCode: "MON",
                },
              },
            }
          : {}),
      }}
    />
  );
}

/** Product/Offer for a marketplace asset (e.g. /activos/[slug]). */
export function ProductSchema(props: {
  name: string;
  description: string;
  url: string;
  image?: string;
  priceMin?: number;
  priceCurrency?: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: props.name,
        description: props.description,
        url: props.url,
        ...(props.image ? { image: props.image } : {}),
        brand: { "@type": "Brand", name: "ActivosYA" },
        ...(props.priceMin
          ? {
              offers: {
                "@type": "Offer",
                price: props.priceMin,
                priceCurrency: props.priceCurrency ?? "PEN",
                availability: "https://schema.org/InStock",
                url: props.url,
                seller: { "@id": "https://activosya.com/#organization" },
              },
            }
          : {}),
      }}
    />
  );
}

/** Mobile app entity — for EcoDrive+ passenger/driver apps. */
export function MobileApplicationSchema(props: {
  name: string;
  description: string;
  url: string;
  category?: string;
  operatingSystem?: string;
  priceCurrency?: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "MobileApplication",
        name: props.name,
        description: props.description,
        url: props.url,
        applicationCategory: props.category ?? "TravelApplication",
        operatingSystem: props.operatingSystem ?? "Android, iOS",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: props.priceCurrency ?? "PEN",
        },
        provider: { "@id": "https://activosya.com/#organization" },
      }}
    />
  );
}

/** FAQPage — the single highest-impact schema for generative-engine citations. */
export function FaqSchema(props: { items: Faq[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: props.items.map((it) => ({
          "@type": "Question",
          name: it.q,
          acceptedAnswer: { "@type": "Answer", text: it.a },
        })),
      }}
    />
  );
}

export function BreadcrumbSchema(props: { items: Array<{ name: string; url: string }> }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: props.items.map((it, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: it.name,
          item: it.url,
        })),
      }}
    />
  );
}
