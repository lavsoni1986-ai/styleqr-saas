"use client";

import { Plus, Minus, Utensils } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { getCloudinaryThumbnail } from "@/lib/cloudinary";

export interface MobileMenuItem {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  image?: string | null;
}

interface MobileMenuCardProps {
  item: MobileMenuItem;
  quantity: number;
  onAdd: (item: MobileMenuItem) => void;
  onRemove: (itemId: string) => void;
  /** Set for the first LCP image to improve LCP. */
  priority?: boolean;
}

export function MobileMenuCard({ item, quantity, onAdd, onRemove, priority }: MobileMenuCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden active:scale-[0.99] transition-transform touch-manipulation">
      {/* Large Food Image */}
      <div className="relative w-full h-48 sm:h-56 overflow-hidden bg-white/5">
        {item.image && !imageError ? (
          <Image
            src={getCloudinaryThumbnail(item.image, { width: 448, height: 448 })}
            alt={item.name || "Menu item"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
            onError={() => setImageError(true)}
            priority={priority}
            loading={priority ? undefined : "lazy"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Utensils className="h-12 w-12 text-zinc-500" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-zinc-100 leading-tight line-clamp-2">
              {item.name}
            </h3>
            {item.description && (
              <p className="text-sm text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <p className="text-xl font-bold text-amber-400 whitespace-nowrap">
              ${item.price.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          {quantity > 0 ? (
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => onRemove(item.id)}
                className="flex-shrink-0 w-12 h-12 bg-white/10 text-zinc-300 border border-white/10 rounded-xl hover:bg-white/15 active:bg-white/20 transition-colors flex items-center justify-center touch-manipulation"
                aria-label="Remove item"
              >
                <Minus className="h-5 w-5" strokeWidth={2.5} />
              </button>
              <span className="text-lg font-bold text-zinc-100 min-w-[2rem] text-center">
                {quantity}
              </span>
              <button
                data-testid="add-item"
                onClick={() => onAdd(item)}
                className="flex-shrink-0 w-12 h-12 bg-amber-500 text-zinc-950 rounded-xl hover:bg-amber-400 active:bg-amber-300 transition-colors flex items-center justify-center touch-manipulation"
                aria-label="Add item"
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              data-testid="add-item"
              onClick={() => onAdd(item)}
              className="w-full h-12 bg-amber-500 text-zinc-950 font-bold rounded-xl hover:bg-amber-400 active:bg-amber-300 transition-colors flex items-center justify-center gap-2 touch-manipulation"
              aria-label={`Add ${item.name} to cart`}
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              <span>Add to Cart</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
