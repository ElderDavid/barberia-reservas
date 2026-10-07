"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clientAccount } from "@/server/admin/clients";
import { redeemReward } from "@/server/loyalty";
import { requireOwner } from "@/server/session";

const clientIdSchema = z.uuid();

/** Hands over the loyalty reward to the client's account. */
export async function canjearPremio(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const parsed = clientIdSchema.safeParse(formData.get("clientId"));
  if (!parsed.success) redirect("/admin/clientes");
  const clientId = parsed.data;
  // The account is looked up here, never taken from the form.
  const userId = await clientAccount(clientId);
  if (!userId) redirect(`/admin/clientes/${clientId}?error=not_found`);
  const result = await redeemReward({ userId }, owner.id, new Date());
  if (!result.ok) redirect(`/admin/clientes/${clientId}?error=${result.error}`);
  revalidatePath(`/admin/clientes/${clientId}`);
  redirect(`/admin/clientes/${clientId}?canjeado=1`);
}
