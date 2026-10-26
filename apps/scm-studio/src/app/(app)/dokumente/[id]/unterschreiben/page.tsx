import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { SignFlow, type SignStep } from "@/components/dokumente/sign-flow";
import { getCurrentUser } from "@/lib/auth";
import { getDocument } from "@/lib/dokumente/data";
import { consentSigners, ROLLEN, ZWECK_KEYS, ZWECKE, type EinwilligungData, type VertragData } from "@/lib/dokumente/schema";
import { dateDe, eurShort } from "@/lib/format";

export const metadata = { title: "Unterschreiben" };

type P = Promise<{ id: string }>;

export default function UnterschreibenPage({ params }: { params: P }) {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[70] bg-surface" />}>
      <Inner params={params} />
    </Suspense>
  );
}

async function Inner({ params }: { params: P }) {
  const { id } = await params;
  const found = await getDocument(Number(id));
  if (!found) notFound();
  const { doc, client } = found;
  if (doc.kind !== "vertrag" && doc.kind !== "einwilligung") redirect(`/dokumente/${doc.id}`);
  if (doc.status !== "final") redirect(`/dokumente/${doc.id}`);
  const user = await getCurrentUser();
  const pdfHref = `/api/dokumente/${doc.id}/pdf`;
  const backHref = `/dokumente/${doc.id}`;

  if (doc.kind === "vertrag") {
    const d = doc.data as unknown as VertragData;
    const steps: SignStep[] = [];
    if (!d.scmSignature) steps.push({ role: "scm", label: "Unterschrift für SCM", name: user?.name ?? "SCM" });
    steps.push({ role: "kunde", label: "Unterschrift für den Auftraggeber", name: d.unterzeichnerName || d.party?.signatoryName || "", nameEditable: true });
    const price = Number(d.preisEuro.replace(/\./g, "").replace(",", "."));
    return (
      <SignFlow docId={doc.id} title={doc.title} backHref={backHref} pdfHref={pdfHref} steps={steps} defaultPlace={client?.city ?? ""}>
        <h1 className="text-[26px] font-semibold leading-tight text-ink">Dienstleistungsvertrag</h1>
        <p>
          Zwischen SCM und <strong className="text-ink">{d.party?.name ?? client?.name}</strong> über {d.paketVideos} Videos pro Monat für {eurShort(Math.round(price * 100))} netto im Monat, ab{" "}
          {dateDe(d.beginn)}, Mindestlaufzeit {d.mindestlaufzeitMonate} Monate.
        </p>
        <p>Bitte lest den vollständigen Vertrag im PDF, bevor ihr unterschreibt.</p>
        {d.scmSignature && <p className="text-[14px] text-muted">SCM hat bereits unterschrieben ({d.scmSignature.name}).</p>}
      </SignFlow>
    );
  }

  const d = doc.data as unknown as EinwilligungData;
  const steps: SignStep[] = consentSigners(d).map((s) => ({ ...s, nameEditable: !s.name }));
  return (
    <SignFlow
      docId={doc.id}
      title={doc.title}
      backHref={backHref}
      pdfHref={pdfHref}
      steps={steps}
      defaultPlace={d.ort ?? ""}
      zwecke={ZWECK_KEYS.map((k) => ({ key: k, label: ZWECKE[k].label, text: ZWECKE[k].text }))}
      initialZwecke={d.zwecke}
    >
      <h1 className="text-[26px] font-semibold leading-tight text-ink">Einwilligung in Foto- und Videoaufnahmen</h1>
      <p>
        <strong className="text-ink">{d.personName}</strong> ({ROLLEN[d.rolle]}) beim Dreh am {dateDe(d.drehtag)}
        {client ? ` für ${client.name}` : ""}. Bitte wählen Sie unten selbst aus, wofür Sie einwilligen.
      </p>
      <p>Die Einwilligung ist freiwillig und kann jederzeit für die Zukunft widerrufen werden. Die Datenschutzhinweise stehen im PDF.</p>
      {d.minderjaehrig && <p className="text-[14px] text-muted">Minderjährig: Es unterschreiben die Sorgeberechtigten{d.ab14 ? " und die Person selbst" : ""}.</p>}
    </SignFlow>
  );
}
