/**
 * Structured Data (JSON-LD) for SEO
 * Provides schema.org markup for better search engine understanding
 */

export function getStructuredData() {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "StyleQR",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "Modern QR-based restaurant ordering and management system",
    url: baseUrl,
    author: {
      "@type": "Organization",
      name: "StyleQR",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "150",
    },
  };
}

export function getRestaurantStructuredData(restaurant: {
  name: string;
  description?: string | null;
  image?: string | null;
}) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    description: restaurant.description || "",
    image: restaurant.image || "",
    url: baseUrl,
    servesCuisine: "Various",
    priceRange: "₹₹",
  };
}

