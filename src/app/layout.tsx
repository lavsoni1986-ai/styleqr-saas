import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

export const dynamic = "force-dynamic";

// Optimize font loading with preload and display swap
const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-plus-jakarta-sans",
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  title: {
    default: "StyleQR - QR Restaurant Management",
    template: "%s | StyleQR",
  },
  description: "Modern QR-based restaurant ordering and management system. Transform your restaurant with digital menus, contactless ordering, and powerful management tools.",
  keywords: ["QR menu", "restaurant management", "contactless ordering", "digital menu", "restaurant POS"],
  authors: [{ name: "StyleQR" }],
  creator: "StyleQR",
  publisher: "StyleQR",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "StyleQR",
    title: "StyleQR - QR Restaurant Management",
    description: "Modern QR-based restaurant ordering and management system",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "StyleQR",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StyleQR - QR Restaurant Management",
    description: "Modern QR-based restaurant ordering and management system",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add Google Search Console verification if needed
    // google: "verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={font.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${font.className} bg-zinc-950 text-zinc-100`}>{children}</body>
    </html>
  );
}
