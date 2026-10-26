// Demo-Daten Posting-Kalender: ein fertiges Video ist eingeplant, das andere wartet in „Bereit zum Posten“.
import { eq } from "drizzle-orm";
import { addDays } from "date-fns";
import * as s from "../../src/db/schema";
import { berlinDateTime, todayIso } from "../../src/lib/time";
import type { SeedPart } from "../seed";

const part: SeedPart = async (db, ctx) => {
  const stammgast = ctx.videos.find((v) => v.title === "Der Stammgast");
  if (!stammgast) return "kein Video";
  await db
    .update(s.videos)
    .set({ scheduledAt: berlinDateTime(todayIso(addDays(ctx.today, 2)), "18:30"), platform: "beide" })
    .where(eq(s.videos.id, stammgast.id));
  return "1 Post geplant";
};

export default part;
