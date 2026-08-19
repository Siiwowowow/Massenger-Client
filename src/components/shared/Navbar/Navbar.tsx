"use client";

import DesktopNav from "./DesktopNav";
import MobileNav from "./MobileNav";
import type { NavbarProps } from "./types";
import { Home, Sparkles, Cpu, Layers, BookOpen } from "lucide-react";

// ✅ Public Starter Links
const defaultPublicLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Features", href: "/#features", icon: Sparkles },
  { label: "Tech Stack", href: "/#tech-stack", icon: Cpu },
  { label: "UI Kit", href: "/#components", icon: Layers },
  { label: "Quickstart", href: "/#quickstart", icon: BookOpen },
];

export default function Navbar({}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 shadow-sm">
      <DesktopNav publicLinks={defaultPublicLinks} />
      <MobileNav publicLinks={defaultPublicLinks} />
    </header>
  );
}