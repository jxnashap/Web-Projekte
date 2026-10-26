// Typen für das Paket "hyphen" (deutsche Silbentrennung nach Liang/TeX-Mustern)
declare module "hyphen/de" {
  export function hyphenateSync(text: string, options?: { hyphenChar?: string; minWordLength?: number }): string;
}
