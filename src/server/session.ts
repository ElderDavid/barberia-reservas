import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth.ts";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "customer";
  phone: string | null;
};

/** The signed-in user, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, role, phone } = session.user;
  return { id, name, email, role: role === "owner" ? "owner" : "customer", phone: phone ?? null };
}

/** Returns the owner or redirects to /entrar; a signed-in customer is not the owner. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user?.role !== "owner") redirect("/entrar");
  return user;
}

/** Returns the signed-in customer or sends them to sign in and come back to `returnTo`. */
export async function requireCustomer(returnTo = "/cuenta"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (user?.role === "customer") return user;
  if (user?.role === "owner") redirect("/admin");
  redirect(`/entrar?volver=${encodeURIComponent(returnTo)}`);
}
