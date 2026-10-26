// Bezeichnungen der Datenquellen (eine Quelle für Tabelle, Detailseite und Import).
export const SOURCE_LABEL: Record<string, string> = { manuell: "Manuell", csv: "CSV", instagram: "Instagram", tiktok: "TikTok" };
export const sourceLabel = (s: string) => SOURCE_LABEL[s] ?? s;
