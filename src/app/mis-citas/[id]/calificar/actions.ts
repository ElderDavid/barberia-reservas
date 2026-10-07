"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { saveReview } from "@/server/accounts/reviews";
import { requireCustomer } from "@/server/session";

const reviewForm = z.object({
  bookingId: z.uuid(),
  rating: z.string().regex(/^[1-5]$/),
  comment: z.string().max(2000).default(""),
});

/** Saves the customer's stars and comment for an attended visit. */
export async function calificar(formData: FormData): Promise<void> {
  const raw = {
    bookingId: formData.get("bookingId"),
    rating: formData.get("rating") ?? undefined,
    comment: formData.get("comment") ?? undefined,
  };
  const id = z.uuid().safeParse(raw.bookingId);
  if (!id.success) redirect("/mis-citas");
  const user = await requireCustomer(`/mis-citas/${id.data}/calificar`);
  const parsed = reviewForm.safeParse(raw);
  if (!parsed.success) redirect(`/mis-citas/${id.data}/calificar?error=invalid_input`);
  const result = await saveReview(user.id, parsed.data, new Date());
  if (!result.ok) redirect(`/mis-citas/${id.data}/calificar?error=${result.error}`);
  revalidatePath("/mis-citas");
  redirect(`/mis-citas/${id.data}?calificada=1`);
}
