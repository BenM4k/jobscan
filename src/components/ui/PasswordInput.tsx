"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function PasswordInput({
  label,
  error,
  className,
  containerClassName,
  disabled,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations("auth");

  return (
    <div className={cn("space-y-1", containerClassName)}>
      {label && (
        <label className="block text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          type={showPassword ? "text" : "password"}
          disabled={disabled}
          className={cn(
            "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 text-xs font-medium rounded-xl py-3 pl-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:outline-none transition disabled:opacity-50",
            error && "border-rose-500 focus:ring-rose-500",
            className
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? t("hidePassword") : t("showPassword")}
          title={showPassword ? t("hidePassword") : t("showPassword")}
          className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 focus:outline-none transition cursor-pointer p-1 rounded-md"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {error && <p className="text-[11px] font-semibold text-rose-500">{error}</p>}
    </div>
  );
}
