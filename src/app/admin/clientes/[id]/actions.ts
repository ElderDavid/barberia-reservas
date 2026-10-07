"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { redeemReward } from "@/server/loyalty";
import { requireOwner } from "@/server/session";

const redeemForm = z.object({ clientId: z.uuid(), userId: z.string().min(1).max(64) });

/** Hands over the loyalty reward to the client's account. */
export async function canjearPremio(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  const parsed = redeemForm.safeParse({
    clientId: formData.get("clientId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) redirect("/admin/clientes");
  const { clientId, userId } = parsed.data;
  const result = await redeemReward({ userId }, owner.id, new Date());
  if (!result.ok) redirect(`/admin/clientes/${clientId}?error=${result.error}`);
  revalidatePath(`/admin/clientes/${clientId}`);
  redirect(`/admin/clientes/${clientId}?canjeado=1`);
}
