"use client";

import { useState, useMemo } from "react";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { useUser } from "@/features/user/hooks/useUser";
import Logo from "./Logo";
import AuthButtons from "./AuthButtons";
import UserAvatar from "./UserAvatar";
import { getDashboardRoute } from "./utils";
import type { NavLink } from "./types";
import NavLinks from "./NavLinks";

interface Props {
  publicLinks: NavLink[];
}

export default function MobileNav({
  publicLinks,
}: Props) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const dashboardRoute = getDashboardRoute(user?.role);

  const allLinks: NavLink[] = useMemo(() => [
    ...publicLinks,
    ...(user
      ? [{ label: "Dashboard", href: dashboardRoute, icon: LayoutDashboard }]
      : []),
  ], [publicLinks, user, dashboardRoute]);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden w-full bg-white dark:bg-gray-950">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between h-16 px-4">
        <Logo />
        <div className="flex items-center gap-3">
          {user && <UserAvatar />}
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Slide-down drawer */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 space-y-4 shadow-inner">
          <NavLinks links={allLinks} onLinkClick={close} orientation="vertical" />

          {/* Auth */}
          {!user && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <AuthButtons onLinkClick={close} orientation="vertical" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}