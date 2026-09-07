// components/shared/Navbar/DesktopNav.tsx

"use client";

import { useMemo } from "react";
import { useUser } from "@/features/user/hooks/useUser";
import { LayoutDashboard, MessageSquare } from "lucide-react";
import Logo from "./Logo";
import AuthButtons from "./AuthButtons";
import UserAvatar from "./UserAvatar";
import { getDashboardRoute } from "./utils";
import type { NavLink } from "./types";
import NavLinks from "./NavLinks";

interface Props {
  publicLinks: NavLink[];
}

export default function DesktopNav({
  publicLinks,
}: Props) {
  const { user } = useUser();
  const dashboardRoute = getDashboardRoute(user?.role);

  const navLinks: NavLink[] = useMemo(() => [
    ...publicLinks,
    ...(user
      ? [
          { label: "Dashboard", href: dashboardRoute, icon: LayoutDashboard },
          { label: "Messages", href: "/messages", icon: MessageSquare },
        ]
      : []),
  ], [publicLinks, user, dashboardRoute]);

  return (
    <div className="hidden md:block w-full">
      <div className="flex items-center justify-between h-16 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <NavLinks links={navLinks} orientation="horizontal" />
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <UserAvatar />
          ) : (
            <AuthButtons />
          )}
        </div>
      </div>
    </div>
  );
}