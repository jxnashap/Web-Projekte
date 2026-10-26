// Typen für das Paket "hyphen" (deutsche Silbentrennung nach Liang/TeX-Mustern, CommonJS)
declare module "hyphen/de" {
  const hyphen: { hyphenateSync(text: string, options?: { hyphenChar?: string; minWordLength?: number }): string };
  export default hyphen;
}
