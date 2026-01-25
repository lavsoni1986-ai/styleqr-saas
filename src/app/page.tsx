import Link from "next/link";
import { UtensilsCrossed, QrCode, ShoppingCart, Shield } from "lucide-react";
import { getStructuredData } from "./structured-data";

export const metadata = {
  title: "StyleQR - QR Restaurant Management",
  description: "Transform your restaurant with digital menus, contactless ordering, and powerful management tools.",
  openGraph: {
    title: "StyleQR - QR Restaurant Management",
    description: "Transform your restaurant with digital menus, contactless ordering, and powerful management tools.",
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 bg-orange-500 rounded-2xl">
              <QrCode className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              StyleQR
            </h1>
          </div>
          <p className="text-2xl text-slate-700 mb-4">
            Modern QR-Based Restaurant Management
          </p>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Transform your restaurant with digital menus, contactless ordering, and powerful management tools.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-5xl mx-auto">
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
            <div className="p-3 bg-orange-100 rounded-2xl w-fit mb-4">
              <QrCode className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">QR Menus</h3>
            <p className="text-slate-600">
              Generate unique QR codes for each table. Customers scan and order instantly.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
            <div className="p-3 bg-blue-100 rounded-2xl w-fit mb-4">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Order Management</h3>
            <p className="text-slate-600">
              Real-time order tracking, kitchen display, and seamless order fulfillment.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
            <div className="p-3 bg-purple-100 rounded-2xl w-fit mb-4">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Admin Dashboard</h3>
            <p className="text-slate-600">
              Complete control over menus, orders, tables, and restaurant operations.
            </p>
          </div>
        </div>

        <div className="text-center">
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-orange-600 font-bold rounded-2xl border-2 border-orange-600 hover:bg-orange-50 transition-all"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
