import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getDistrictFromHost } from "@/lib/get-district-from-host";
import { DistrictProvider } from "@/components/providers/DistrictProvider";
import { NoiseOverlay } from "@/components/home/NoiseOverlay";
import { GlobalFooter } from "@/components/GlobalFooter";

export const dynamic = "force-dynamic";

// Optimize font loading with preload and display swap
const font = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
  fallback: ["system-ui", "sans-serif"],
});

// Metadata is now generated dynamically based on district
// This function will be called per request to inject district-specific metadata
export async function generateMetadata(): Promise<Metadata> {
  const district = await getDistrictFromHost();
  const districtName = district?.name || "StyleQR";
  const siteName = district ? `${districtName} - StyleQR` : "StyleQR - QR Restaurant Management";
  const description = district
    ? `${districtName} restaurant ordering and management powered by StyleQR`
    : "Modern QR-based restaurant ordering and management system. Transform your restaurant with digital menus, contactless ordering, and powerful management tools.";

  // Get base URL dynamically (no hardcoded domain)
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  return {
    title: {
      default: siteName,
      template: `%s | ${districtName}`,
    },
    description,
    icons: {
      icon: "/favicon.ico",
    },
    keywords: ["QR menu", "restaurant management", "contactless ordering", "digital menu", "restaurant POS"],
    authors: [{ name: districtName }],
    creator: districtName,
    publisher: districtName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "/",
      siteName: districtName,
      title: siteName,
      description,
      images: district?.logoUrl
        ? [
            {
              url: district.logoUrl,
              width: 1200,
              height: 630,
              alt: districtName,
            },
          ]
        : [
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
      title: siteName,
      description,
      images: district?.logoUrl ? [district.logoUrl] : ["/og-image.png"],
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
      google: "-Fno4LBYgpKkR6AKXxtbe65nOWxp3VtC1wgmkHD3yVM",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get district from hostname (for custom domain white-label support)
  const district = await getDistrictFromHost();

  // Determine branding based on district or fallback to platform default
  const logoUrl = district?.logoUrl || null;
  const primaryColor = district?.primaryColor || null;
  const districtName = district?.name || "StyleQR";
  const siteName = district ? `${districtName} - StyleQR` : "StyleQR - QR Restaurant Management";

  // Generate CSS custom properties for district branding
  const districtStyles = primaryColor
    ? {
        "--district-primary": primaryColor,
      }
    : {};

  return (
    <html lang="en" className={font.variable} style={districtStyles as React.CSSProperties}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {primaryColor && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
                :root {
                  --district-primary: ${primaryColor};
                }
                .btn-primary-admin {
                  background-color: ${primaryColor};
                }
                .btn-primary-admin:hover {
                  background-color: ${primaryColor}dd;
                }
              `,
            }}
          />
        )}
      </head>
      <body className={`${font.className} bg-zinc-950 text-zinc-100`}>
        <NoiseOverlay />
        <DistrictProvider district={district}>
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
            <GlobalFooter />
          </div>
        </DistrictProvider>
      </body>
    </html>
  );
}
