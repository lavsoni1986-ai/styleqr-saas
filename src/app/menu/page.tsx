import { Suspense } from "react";
import MenuClient from "./MenuClient";

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-amber-400 border-t-transparent mb-4" />
            <p className="text-zinc-400">Loading menu...</p>
          </div>
        </div>
      }
    >
      <MenuClient />
    </Suspense>
  );
}
