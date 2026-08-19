import { Layers } from "lucide-react";
import Link from "next/link";

interface LogoProps {
  name?: string;
  subtitle?: string;
}

export default function Logo({
  name = "PrimarySetup",
  subtitle = "Next.js 16 Starter",
}: LogoProps) {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-600/30 blur-md rounded-xl group-hover:bg-blue-600/50 transition-all duration-300" />
        <div className="relative w-9 h-9 bg-linear-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
          <Layers className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="flex flex-col">
        <span className="text-base font-bold bg-linear-to-r from-slate-900 via-blue-900 to-slate-800 dark:from-white dark:via-blue-100 dark:to-slate-300 bg-clip-text text-transparent leading-tight tracking-tight">
          {name}
        </span>
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-none">
          {subtitle}
        </span>
      </div>
    </Link>
  );
}