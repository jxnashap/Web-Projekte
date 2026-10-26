import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // eigener Ausgabeordner pro Dev-Server möglich (NEXT_DIST_DIR), damit mehrere Vorschauen parallel laufen
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  // Das Next-Symbol unten links liegt sonst auf dem Profil und dem Tab "Heute"; Fehler zeigt Next trotzdem an
  devIndicators: false,
  partialPrefetching: true,
  // PGlite lädt WASM-Dateien zur Laufzeit; e-invoice-eu liest Schemas und ICC-Profile aus dem Paket.
  serverExternalPackages: ["@electric-sql/pglite", "@e-invoice-eu/core"],
  // Schriften für die PDFs liegen als TTF in assets/fonts und müssen in jede Function mit,
  // ebenso die Demo-Daten des Testlinks ohne Supabase (.data/demo, nur bei npm run build:vercel).
  outputFileTracingIncludes: {
    "/*": ["./assets/fonts/**/*", "./.data/demo/**/*"],
    "/**": ["./assets/fonts/**/*", "./.data/demo/**/*"],
  },
  // Mit echter Datenbank (DATABASE_URL schon beim Build) brauchen die Functions weder PGlite (über 20 MB)
  // noch lokale Daten: kleinere Functions, schnellere Kaltstarts.
  ...(process.env.DATABASE_URL ? { outputFileTracingExcludes: { "/**": ["./node_modules/@electric-sql/pglite/**/*", "./.data/**/*"] } } : {}),
  experimental: {
    // Belege (Fotos/PDF) gehen lokal per Server Action hoch. Auf Vercel gilt zusätzlich das Limit
    // der Plattform (4,5 MB pro Anfrage), deshalb verkleinert der Browser Fotos vor dem Hochladen.
    serverActions: { bodySizeLimit: "10mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // eigene PDF-Vorschauen im iframe erlauben, fremde Seiten dürfen die App nicht einbetten
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
