import Script from "next/script";

export function OrganizationSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ActivosYA",
    legalName: "EcoDrive Plus SAC",
    url: "https://activosya.com",
    logo: "https://activosya.com/og-default.png",
    description:
      "Marketplace de activos digitales en LATAM. Plataformas SaaS llave-en-mano con flujo de caja verificado.",
    foundingDate: "2026",
    address: { "@type": "PostalAddress", addressCountry: "PE", addressLocality: "Trujillo" },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "destinoya333@gmail.com",
      availableLanguage: ["es"],
    },
    sameAs: ["https://www.facebook.com/Destinoya.pe"],
  };
  return (
    <Script
      id="schema-org-organization"
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
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
  const data = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: props.name,
    description: props.description,
    url: props.url,
    provider: { "@type": "Organization", name: "ActivosYA", url: "https://activosya.com" },
    areaServed: { "@type": "Country", name: "Perú" },
    ...(props.rentalPriceMin
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "PEN",
            price: props.rentalPriceMin,
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              priceType: "Rental",
              billingIncrement: 1,
              unitCode: "MON",
            },
          },
        }
      : {}),
  };
  return (
    <Script
      id={`schema-service-${props.name.replace(/\s+/g, "-").toLowerCase()}`}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbSchema(props: { items: Array<{ name: string; url: string }> }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: props.items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
  return (
    <Script
      id="schema-breadcrumb"
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
