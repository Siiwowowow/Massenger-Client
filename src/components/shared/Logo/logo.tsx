import { Shield } from "lucide-react";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="relative">
        <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-blue-500 blur-md opacity-60 group-hover:opacity-100 transition" />
        <div className="relative w-9 h-9 bg-linear-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
          <Shield className="w-4 h-4 text-white" />
        </div>
      </div>

      <div>
        <span className="text-xl font-bold bg-linear-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent font-poppins">
          BetterAuth
        </span>
        <span className="block text-[10px] text-muted-foreground">
          Secure Portal
        </span>
      </div>
    </Link>
  );
}
