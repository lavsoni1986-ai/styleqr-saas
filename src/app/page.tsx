import { getStructuredData } from "./structured-data";
import { HomePage } from "@/components/home/HomePage";

export const metadata = {
  title: "StyleQR - India's District Operating System for Restaurants",
  description:
    "Restaurant infrastructure for multi-location operators. One platform to govern districts, restaurants, and partners. Control. Compliance. Automated revenue.",
  openGraph: {
    title: "StyleQR - India's District Operating System for Restaurants",
    description:
      "Restaurant infrastructure for multi-location operators. One platform to govern districts, restaurants, and partners.",
    type: "website",
  },
};

export default function Home() {
  const structuredData = getStructuredData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomePage />
    </>
  );
}
