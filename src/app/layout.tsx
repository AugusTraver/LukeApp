import type { Metadata, Viewport } from "next";
import { Figtree, Newsreader } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "LukeApp",
  description: "¿A quién le toca sacar al perro hoy? Turnos de paseo para toda la familia.",
  appleWebApp: { capable: true, title: "LukeApp", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#f2f1ea",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${figtree.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
