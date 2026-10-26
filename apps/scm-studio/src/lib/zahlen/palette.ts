// Diagrammfarben: geprüfte Kategorie-Palette (Farbfehlsichtigkeit, Abstand je Nachbarpaar, geprüft mit
// dem dataviz-Validator gegen Weiß). Kundenfarben aus den Stammdaten sind dafür nicht geeignet
// (zwei Grüntöne, zu wenig Abstand), deshalb bekommt jeder Kunde fest einen Platz nach Kunden-ID.
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"] as const;

/** Farbe folgt dem Kunden, nicht dem Rang: Platz = Position der Kunden-ID in der Gesamtliste. */
export function seriesColorMap(allClientIds: number[]): Map<number, string> {
  const ids = [...allClientIds].sort((a, b) => a - b);
  return new Map(ids.map((id, i) => [id, SERIES[i % SERIES.length]]));
}

export const INK = "#1d1d1f";
export const ACCENT = "#e1251b";
export const GRID = "#e8e8ed";
export const AXIS = "#6e6e73"; // Achsentext: 5:1 auf Weiß (WCAG AA)
