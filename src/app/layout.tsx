import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { PushManager } from "@/components/push-manager";
import { InstallBanner } from "@/components/install-banner";
import { Arcade } from "@/components/arcade";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "FulboMundial",
  description: "Organizá tus partidos de fútbol con amigos: anotarse, equipos, historial y estadísticas.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FulboMundial",
  },
};

export const viewport: Viewport = {
  themeColor: "#15803d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Layout principal de la aplicación
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">{children}</main>
          <InstallBanner />
          <PushManager />
          <Arcade />
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
