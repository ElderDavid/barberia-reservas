import { exportAccount } from "@/server/accounts/export";
import { getSessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const user = await getSessionUser();
  if (user?.role !== "customer") return new Response("No autorizado", { status: 401 });
  const data = await exportAccount(user.id, new Date());
  if (!data) return new Response("No encontrado", { status: 404 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mis-datos.json"',
      "Cache-Control": "no-store",
    },
  });
}
