import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth.ts";

export type OwnerSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/** The current session, or null. Sign-up is disabled, so any session belongs to the owner. */
export async function getOwnerSession(): Promise<OwnerSession | null> {
  return auth.api.getSession({ headers: await headers() });
}

/** Returns the owner's session or redirects to /entrar. */
export async function requireOwner(): Promise<OwnerSession> {
  const session = await getOwnerSession();
  if (!session) redirect("/entrar");
  return session;
}
