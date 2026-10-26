"use client";
// Knopf, der einen Parameter (z. B. ?neu=1) an die aktuelle URL hängt und Filter dabei behält.
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LinkButton } from "@/components/ui/button";

type Props = { param?: string; value?: string; children: React.ReactNode; variant?: React.ComponentProps<typeof LinkButton>["variant"] };

function Inner({ param = "neu", value = "1", children, variant }: Props) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const next = new URLSearchParams(sp.toString());
  next.set(param, value);
  return (
    <LinkButton href={`${pathname}?${next.toString()}`} scroll={false} variant={variant}>
      {children}
    </LinkButton>
  );
}

export function ParamLink(props: Props) {
  return (
    <Suspense
      fallback={
        <LinkButton href={`?${props.param ?? "neu"}=${props.value ?? "1"}`} variant={props.variant}>
          {props.children}
        </LinkButton>
      }
    >
      <Inner {...props} />
    </Suspense>
  );
}
