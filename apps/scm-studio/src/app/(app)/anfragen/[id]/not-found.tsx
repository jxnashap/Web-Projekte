import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { BackLink } from "@/components/ui/page-header";

export default function AnfrageNotFound() {
  return (
    <>
      <BackLink href="/anfragen" label="Anfragen" className="mb-6" />
      <EmptyState
        icon={<SearchX className="size-5" />}
        title="Anfrage nicht gefunden"
        action={
          <LinkButton href="/anfragen" variant="secondary">
            Zu den Anfragen
          </LinkButton>
        }
      >
        Diese Anfrage gibt es nicht (mehr). Vielleicht wurde sie gelöscht oder der Link ist alt.
      </EmptyState>
    </>
  );
}
