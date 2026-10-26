import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { BackLink } from "@/components/ui/page-header";

export default function DokumentNotFound() {
  return (
    <>
      <BackLink href="/dokumente" label="Dokumente" className="mb-6" />
      <EmptyState
        icon={<SearchX className="size-5" />}
        title="Dokument nicht gefunden"
        action={
          <LinkButton href="/dokumente/papierkorb" variant="secondary">
            Zum Papierkorb
          </LinkButton>
        }
      >
        Dieses Dokument gibt es nicht (mehr). Vielleicht liegt es im Papierkorb, wurde endgültig gelöscht oder der Link ist alt.
      </EmptyState>
    </>
  );
}
