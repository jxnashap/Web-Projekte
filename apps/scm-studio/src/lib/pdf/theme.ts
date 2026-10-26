// Gestaltung der PDF-Dokumente: Weiß, viel Luft, Tinte, ein roter Akzent. Schrift Archivo,
// Etiketten in Courier Prime (wie die Website). Maße in Punkt (A4 = 595 × 842 pt, 1 mm ≈ 2,835 pt).
import path from "node:path";
import { Font } from "@react-pdf/renderer";

export const C = {
  ink: "#0E0E11",
  ink2: "#3D3D42",
  muted: "#6B6B72",
  faint: "#A2A2A8",
  line: "#E6E3DD",
  soft: "#F6F5F2",
  accent: "#E1251B",
  logoRed: "#FF3B21",
};

export const MM = 2.8346;
export const PAGE = { marginX: 20 * MM, marginTop: 16 * MM, marginBottom: 30 * MM };

let registered = false;
export function registerFonts() {
  if (registered) return;
  const dir = path.join(process.cwd(), "assets", "fonts");
  Font.register({
    family: "Archivo",
    fonts: [
      { src: path.join(dir, "Archivo-Regular.ttf"), fontWeight: 400 },
      { src: path.join(dir, "Archivo-Medium.ttf"), fontWeight: 500 },
      { src: path.join(dir, "Archivo-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(dir, "Archivo-Bold.ttf"), fontWeight: 700 },
      { src: path.join(dir, "Archivo-CondensedExtraBold.ttf"), fontWeight: 800 },
    ],
  });
  Font.register({
    family: "Courier Prime",
    fonts: [
      { src: path.join(dir, "CourierPrime-Regular.ttf"), fontWeight: 400 },
      { src: path.join(dir, "CourierPrime-Bold.ttf"), fontWeight: 700 },
    ],
  });
  // Keine Silbentrennung mit Bindestrichen mitten im Wort (wirkt unruhig); lange Wörter brechen nur bei Bedarf.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
