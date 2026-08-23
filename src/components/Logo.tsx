import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  badgeText?: string;
  priority?: boolean;
}

export function Logo({
  size = 32,
  className,
  showText = false,
  textClassName,
  badgeText,
  priority = false,
}: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.png"
          alt="JobPilot Logo"
          width={size}
          height={size}
          priority={priority}
          className="w-full h-full object-contain drop-shadow-xs"
        />
      </div>

      {showText && (
        <span
          className={cn(
            "font-black tracking-tight text-gray-900 dark:text-slate-100 flex items-center gap-1.5",
            textClassName
          )}
        >
          JobPilot
          {badgeText && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {badgeText}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
