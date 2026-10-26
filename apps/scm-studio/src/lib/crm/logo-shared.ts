// Adresse des Kunden-Logos (Browser und Server). Der Dateischlüssel wechselt bei jedem Upload, das hält den Cache frisch.
export const logoSrc = (clientId: number, logoPath: string | null | undefined) =>
  logoPath ? `/api/kunden/${clientId}/logo?v=${encodeURIComponent(logoPath.split("/").pop() ?? "")}` : null;
