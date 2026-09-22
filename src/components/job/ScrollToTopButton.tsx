"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollToTopButtonProps {
  /** Scroll threshold in pixels before showing button */
  threshold?: number;
  className?: string;
}

/**
 * Plan:
 * 1. Leaf Client Component for window scroll listening and smooth scroll-to-top interaction.
 * 2. Composes official shadcn/ui Button primitive with 'icon' size and rounded-full styling.
 * 3. Floats in bottom-right corner with smooth entrance/exit transitions when user scrolls down the job list.
 */
export function ScrollToTopButton({
  threshold = 300,
  className,
}: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    // Check initial position on mount
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={cn(
        "fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 size-11 rounded-full shadow-lg shadow-black/10 dark:shadow-black/40 border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-all duration-300 ease-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 active:scale-95",
        isVisible
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 translate-y-4 scale-90 pointer-events-none",
        className
      )}
    >
      <ArrowUp className="size-5" />
    </Button>
  );
}
