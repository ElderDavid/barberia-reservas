import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import nextConfig from "../../next.config.ts";
import { GET } from "../../src/app/api/cron/expire-holds/route.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const CRON_SECRET = "test-cron-secret-0123456789";
let shop: ShopFixture;

async function insertHeld(startsAt: string, holdExpiresAt: string, tokenHash: string) {
  const [row] = await sql<{ id: string }[]>`
    insert into bookings (barber_id, service_id, customer_id, starts_at, ends_at, blocked_from,
      blocked_until, status, payment_method, price_cop, deposit_cop, deposit_status,
      manage_token_hash, hold_expires_at)
    values (${shop.barberId}, ${shop.serviceId}, ${shop.customerId}, ${startsAt},
      ${startsAt}::timestamptz + interval '30 minutes', ${startsAt},
      ${startsAt}::timestamptz + interval '30 minutes', 'held', 'transfer', 15000, 15000,
      'pending', ${tokenHash}, ${holdExpiresAt})
    returning id
  `;
  return row.id;
}

async function statusOf(id: string) {
  const [row] = await sql<{ status: string; cancelled_by: string | null }[]>`
    select status, cancelled_by from bookings where id = ${id}
  `;
  return row;
}

function cronRequest(authorization?: string) {
  const headers = authorization ? { authorization } : undefined;
  return new Request("http://localhost/api/cron/expire-holds", { headers });
}

beforeAll(() => {
  process.env.CRON_SECRET = CRON_SECRET;
});

beforeEach(async () => {
  await truncateAll();
  shop = await seedShop();
});

describe("deploy hardening", () => {
  it("sends the security headers on every path", async () => {
    const rules = await nextConfig.headers?.();
    const rule = rules?.find((r) => r.source === "/:path*");
    const headers = Object.fromEntries((rule?.headers ?? []).map((h) => [h.key, h.value]));
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  });

  it("rejects the cron call without the bearer token and changes nothing", async () => {
    const id = await insertHeld("2020-01-06T15:00:00Z", "2020-01-01T00:00:00Z", "hash-a");
    expect((await GET(cronRequest())).status).toBe(401);
    expect((await GET(cronRequest("Bearer wrong-secret-000000"))).status).toBe(401);
    expect((await statusOf(id)).status).toBe("held");
  });

  it("expires only the holds whose time has passed", async () => {
    const expired1 = await insertHeld("2020-01-06T15:00:00Z", "2020-01-01T00:00:00Z", "hash-b");
    const expired2 = await insertHeld("2020-01-06T16:00:00Z", "2020-01-01T00:00:00Z", "hash-c");
    const live = await insertHeld("2099-01-05T15:00:00Z", "2099-01-01T00:00:00Z", "hash-d");

    const response = await GET(cronRequest(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ expired: 2 });
    expect(await statusOf(expired1)).toEqual({ status: "cancelled", cancelled_by: "system" });
    expect(await statusOf(expired2)).toEqual({ status: "cancelled", cancelled_by: "system" });
    expect((await statusOf(live)).status).toBe("held");
  });

  it("schedules the cron and migrates and syncs the owner only on production builds", () => {
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
    expect(vercel.crons).toContainEqual(
      expect.objectContaining({ path: "/api/cron/expire-holds" }),
    );
    expect(vercel.buildCommand).toMatch(
      /^if \[ "\$VERCEL_ENV" = "production" \]; then pnpm db:migrate && if \[ -n "\$OWNER_EMAIL" \]; then pnpm owner:create; fi; fi && pnpm build$/,
    );
  });

  it("runs the whole gate in CI, in order", () => {
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    const steps = [
      "pnpm install --frozen-lockfile",
      "pnpm lint",
      "pnpm typecheck",
      "pnpm db:migrate",
      "pnpm test",
      "pnpm test:e2e",
      "pnpm build",
    ];
    const positions = steps.map((step) => ci.indexOf(`run: ${step}\n`));
    for (const position of positions) expect(position).toBeGreaterThanOrEqual(0);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
