import type { MetadataRoute } from "next";

// Installierbar auf dem Homescreen (iPhone: Teilen → Zum Home-Bildschirm), startet ohne Browserleiste.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SCM Studio",
    short_name: "SCM Studio",
    description: "Kunden, Skripte, Drehs, Zahlen und Finanzen von SCM Creatives",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f7",
    theme_color: "#f5f5f7",
    lang: "de",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
