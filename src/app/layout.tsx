import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import QueryProviders from "@/providers/QueryProvider";
import ReduxProvider from "@/providers/ReduxProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Toaster } from "sonner";
import { getUserInfo } from "@/features/auth/services/auth.services";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Pulse Messenger — Modern Real-Time Messenger",
  description:
    "Fast, humanized real-time messaging platform inspired by modern communication usability.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUserInfo();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="h-[100dvh] w-full font-sans antialiased text-slate-900 selection:bg-[#9ef01a] selection:text-[#1a1a1a] overflow-hidden"
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <QueryProviders>
            <ReduxProvider>
              <AuthProvider initialUser={user}>
                <TooltipProvider>
                  <div className="h-full w-full overflow-hidden flex flex-col">
                    {children}
                  </div>
                  <Toaster richColors position="top-right" />
                </TooltipProvider>
              </AuthProvider>
            </ReduxProvider>
          </QueryProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
