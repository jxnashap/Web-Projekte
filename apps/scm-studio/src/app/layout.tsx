import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const archivo = localFont({
  src: "./fonts/archivo-var.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

const courier = localFont({
  src: [
    { path: "./fonts/courier-prime-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/courier-prime-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-courier",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "SCM Studio", template: "%s · SCM Studio" },
  description: "Kunden, Skripte, Drehs, Zahlen und Finanzen von SCM Creatives an einem Ort.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#f6f5f2" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${archivo.variable} ${courier.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
