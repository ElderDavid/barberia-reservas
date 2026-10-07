"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { replyToReview, setReviewHidden } from "@/server/admin/reviews";
import { requireOwner } from "@/server/session";

const filterSchema = z.enum(["todas", "sin-responder"]).catch("todas");
const replyForm = z.object({ reviewId: z.uuid(), reply: z.string().max(2000) });
const hideForm = z.object({ reviewId: z.uuid(), hidden: z.enum(["0", "1"]) });

function back(filter: string, error?: string): never {
  const params = new URLSearchParams();
  if (filter !== "todas") params.set("filtro", filter);
  if (error) params.set("error", error);
  const query = params.toString();
  redirect(`/admin/opiniones${query ? `?${query}` : ""}`);
}

export async function responderOpinion(formData: FormData): Promise<void> {
  await requireOwner();
  const filter = filterSchema.parse(formData.get("filtro"));
  const parsed = replyForm.safeParse({
    reviewId: formData.get("reviewId"),
    reply: formData.get("reply"),
  });
  if (!parsed.success) back(filter, "invalid_input");
  const result = await replyToReview(parsed.data, new Date());
  if (!result.ok) back(filter, result.error);
  revalidatePath("/admin/opiniones");
  back(filter);
}

export async function ocultarOpinion(formData: FormData): Promise<void> {
  await requireOwner();
  const filter = filterSchema.parse(formData.get("filtro"));
  const parsed = hideForm.safeParse({
    reviewId: formData.get("reviewId"),
    hidden: formData.get("hidden"),
  });
  if (!parsed.success) back(filter, "invalid_input");
  const result = await setReviewHidden(parsed.data, new Date());
  if (!result.ok) back(filter, result.error);
  revalidatePath("/admin/opiniones");
  back(filter);
}
