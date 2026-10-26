import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Systemschrift zuerst (SF Pro auf iPhone/Mac), Inter als gleichwertiger Ersatz auf anderen Geräten.
const inter = localFont({
  src: "./fonts/inter-var.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

// Courier Prime nur für Drehbuch-Elemente
const courier = localFont({
  src: [
    { path: "./fonts/courier-prime-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/courier-prime-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-courier",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "SCM Studio", template: "%s · SCM Studio" },
  description: "Kunden, Skripte, Drehs, Zahlen und Finanzen von SCM Creatives an einem Ort.",
  applicationName: "SCM Studio",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "SCM Studio", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${inter.variable} ${courier.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
