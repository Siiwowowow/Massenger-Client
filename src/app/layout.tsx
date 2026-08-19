import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import QueryProviders from "@/providers/QueryProvider";
import ReduxProvider from "@/providers/ReduxProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import Navbar from "@/components/shared/Navbar/Navbar";
import Footer from "@/components/shared/Footer/Footer";
import { Toaster } from "sonner";
import { getUserInfo } from "@/features/auth/services/auth.services";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrimarySetup — Production-Ready Next.js 16 Starter Template",
  description:
    "A modern, robust foundation for Next.js web applications with React 19, Tailwind CSS v4, TanStack Query, and Shadcn UI.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUserInfo();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} flex flex-col min-h-screen font-poppins antialiased bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white`}>
        <QueryProviders>
          <ReduxProvider>
            <AuthProvider initialUser={user}>
              <TooltipProvider>
                <Navbar />
                <main className="flex-1 shrink-0">{children}</main>
                <Footer />
                <Toaster richColors position="top-right" />
              </TooltipProvider>
            </AuthProvider>
          </ReduxProvider>
        </QueryProviders>
      </body>
    </html>
  );
}
