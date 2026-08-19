import React, { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath } from "./utils";
import type { NavLink } from "./types";

interface Props {
  links: NavLink[];
  onLinkClick?: () => void;
  orientation?: "horizontal" | "vertical";
}

function NavLinksComponent({
  links,
  onLinkClick,
  orientation = "horizontal",
}: Props) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className={
        orientation === "horizontal"
          ? "flex items-center gap-1"
          : "flex flex-col gap-0.5"
      }
    >
      {links.map((link, index) => {
        const active = isActivePath(pathname, link.href);
        return (
          <Link
            key={`${link.href}-${index}`}
            href={link.href}
            onClick={onLinkClick}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              active
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {link.icon && <link.icon className="w-4 h-4 shrink-0" />}
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

const NavLinks = memo(NavLinksComponent);
export default NavLinks;

