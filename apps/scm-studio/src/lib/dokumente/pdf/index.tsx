import { DrehplanPdf } from "./drehplan";
import { EinwilligungPdf } from "./einwilligung";
import { MonatsberichtPdf } from "./monatsbericht";
import type { RenderCtx } from "./types";
import { VertragPdf } from "./vertrag";

export function DocumentPdf({ ctx }: { ctx: RenderCtx }) {
  switch (ctx.doc.kind) {
    case "vertrag":
      return <VertragPdf ctx={ctx} />;
    case "einwilligung":
      return <EinwilligungPdf ctx={ctx} />;
    case "drehplan":
      return <DrehplanPdf ctx={ctx} />;
    default:
      return <MonatsberichtPdf ctx={ctx} />;
  }
}
