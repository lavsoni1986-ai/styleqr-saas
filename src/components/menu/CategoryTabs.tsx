"use client";

import { useEffect, useRef } from "react";

interface Category {
  id: string;
  name: string;
}

interface CategoryTabsProps {
  categories: Category[];
  activeCategoryId: string | null;
  onCategoryClick: (categoryId: string) => void;
}

export function CategoryTabs({ categories, activeCategoryId, onCategoryClick }: CategoryTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view only when refs exist; clamp to avoid errors on small screens
  useEffect(() => {
    if (!activeCategoryId || !activeTabRef.current || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const tab = activeTabRef.current;

    const run = () => {
      const desired = tab.offsetLeft - container.offsetLeft - container.clientWidth / 2 + tab.clientWidth / 2;
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      const scrollLeft = Math.max(0, Math.min(desired, maxScroll));
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    };
    requestAnimationFrame(run);
  }, [activeCategoryId]);

  if (categories.length === 0) return null;

  return (
    <div className="sticky top-[73px] sm:top-[81px] z-20 bg-zinc-900/90 backdrop-blur-xl border-b border-white/10">
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3"
      >
        {categories.map((category) => {
          const isActive = activeCategoryId === category.id;
          return (
            <button
              key={category.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => onCategoryClick(category.id)}
              className={`
                flex-shrink-0 px-5 py-2.5 rounded-full font-semibold text-sm transition-all whitespace-nowrap touch-manipulation
                ${isActive
                  ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25"
                  : "bg-white/10 text-zinc-400 hover:bg-white/15 hover:text-zinc-200 border border-white/10"}
              `}
              aria-label={`View ${category.name} category`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
