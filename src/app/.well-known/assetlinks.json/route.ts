import { assetLinks } from "@/lib/asset-links";
import { androidEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  const android = androidEnv();
  const body = android ? assetLinks(android.ANDROID_PACKAGE_NAME, android.ANDROID_CERT_SHA256) : [];
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
