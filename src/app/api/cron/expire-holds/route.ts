import { cronEnv } from "@/lib/env";
import { expireHolds } from "@/server/booking/create";

export const dynamic = "force-dynamic";

/** Vercel Cron calls this with GET and `Authorization: Bearer <CRON_SECRET>`. */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${cronEnv().CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const expired = await expireHolds(new Date());
  return Response.json({ expired });
}
