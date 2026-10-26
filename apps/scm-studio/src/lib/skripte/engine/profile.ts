// Felder des Kreativprofils (Kunde) mit Beschriftung und Hilfetext. Browser und Server.
import type { CreativeProfile } from "@/db/schema";

export const PROFILE_FIELDS: { key: keyof CreativeProfile; label: string; hint: string; placeholder: string }[] = [
  { key: "marke", label: "Marke und Besonderheit", hint: "Wofür steht der Betrieb, was macht ihn anders?", placeholder: "z. B. Familienbetrieb seit 3 Generationen, bekannt für [PLATZHALTER]" },
  { key: "zielgruppe", label: "Zielgruppe", hint: "Wen wollen die Videos erreichen?", placeholder: "z. B. Studierende aus Kiel, Familien am Wochenende" },
  { key: "tonalitaet", label: "Tonalität", hint: "Wie darf es klingen, wie nicht?", placeholder: "z. B. trockener Humor, duzen, nie albern" },
  { key: "personen", label: "Wer kann vor die Kamera", hint: "Rollen statt Namen, wer traut sich was?", placeholder: "z. B. Chef spielt gern mit, Azubi nur kurz im Bild" },
  { key: "orte", label: "Drehorte", hint: "Wo im Betrieb lässt sich drehen?", placeholder: "z. B. Gastraum, Tresen, Küche nur vor 11 Uhr" },
  { key: "requisiten", label: "Requisiten und Produkte", hint: "Was ist da und darf ins Bild?", placeholder: "z. B. Steaks, Pommes, Zapfanlage, Firmenwagen" },
  { key: "tabus", label: "No-Gos", hint: "Was die KI nie vorschlagen soll", placeholder: "z. B. keine Witze über Gäste, kein Alkohol am Steuer" },
  { key: "gutLief", label: "Was gut ankam", hint: "Eure Beobachtung, ergänzt die Zahlen", placeholder: "z. B. Sketche mit dem Chef, Entweder-oder" },
];

export const profileFilled = (p: CreativeProfile | null | undefined) => PROFILE_FIELDS.filter((f) => p?.[f.key]?.trim()).length;
