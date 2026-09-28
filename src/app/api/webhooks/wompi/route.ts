import { handleWompiEvent } from "@/server/payments/webhook";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const { status } = await handleWompiEvent(body, new Date());
  return new Response(null, { status });
}
