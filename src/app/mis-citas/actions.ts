"use server";

import { z } from "zod";
import { claimBookings } from "@/server/accounts/bookings";
import { getSessionUser } from "@/server/session";

const tokensSchema = z.array(z.string().max(64)).max(50);

/** Moves the bookings remembered on this phone into the signed-in customer's account. */
export async function guardarCitasDelCelular(formData: FormData): Promise<number> {
  const user = await getSessionUser();
  if (user?.role !== "customer") return 0;
  const tokens = tokensSchema.safeParse(formData.getAll("token"));
  if (!tokens.success) return 0;
  const result = await claimBookings(user.id, tokens.data, new Date());
  return result.claimed;
}
