"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Settings, User, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

interface NavbarUserDropdownProps {
  userEmail?: string | null;
  userName?: string | null;
  onSignOut: () => void;
}

export function NavbarUserDropdown({
  userEmail,
  userName,
  onSignOut,
}: NavbarUserDropdownProps) {
  const t = useTranslations("nav");

  if (!userEmail) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/sign-in"
          className="text-xs font-bold text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-indigo-400 transition"
        >
          {t("signIn")}
        </Link>
        <Link
          href="/sign-up"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition text-xs font-bold shadow-md shadow-blue-500/20"
        >
          {t("signUp")}
        </Link>
      </div>
    );
  }

  const initials = (userName || userEmail || "US").slice(0, 2).toUpperCase();

  return (
    <div className="pl-2 border-l border-slate-300 dark:border-slate-800">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="relative flex items-center gap-2 rounded-full p-1 h-auto cursor-pointer"
              aria-label="User navigation menu"
            >
              <div
                aria-hidden="true"
                className="size-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center uppercase shadow-xs"
              >
                {initials}
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          }
        />

        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate">
                  {userName || "User"}
                </p>
                <p className="text-xs text-muted-foreground leading-none truncate">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              render={<Link href="/dashboard/profile" />}
              className="cursor-pointer"
            >
              <User className="mr-2 size-4" />
              <span>{t("profile")}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              render={<Link href="/dashboard/settings" />}
              className="cursor-pointer"
            >
              <Settings className="mr-2 size-4" />
              <span>{t("settings")}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onClick={onSignOut}
            className="cursor-pointer"
          >
            <LogOut className="mr-2 size-4" />
            <span>{t("signOut")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
