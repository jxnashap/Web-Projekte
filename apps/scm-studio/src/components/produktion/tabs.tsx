import { LinkTabs } from "@/components/ui/tabs";

/** Bereiche der Produktion: Schnitt-Board und Material der Kunden. */
export function ProduktionTabs({ active }: { active: "schnitt" | "material" }) {
  return (
    <LinkTabs
      className="mb-6"
      items={[
        { href: "/produktion", label: "Schnitt", active: active === "schnitt" },
        { href: "/produktion/material", label: "Material", active: active === "material" },
      ]}
    />
  );
}
