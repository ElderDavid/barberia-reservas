import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.ts";
import { bookings, reviews } from "../db/schema.ts";

export type AccountReview = {
  rating: number;
  comment: string;
  ownerReply: string | null;
  repliedAt: Date | null;
  updatedAt: Date;
};

export type SaveReviewResult =
  | { ok: true }
  | { ok: false; error: "invalid_input" | "not_found" | "not_completed" | "already_replied" };

/** Browsers send textarea line breaks as CRLF but count them as one character in `maxLength`. */
export const lineBreaks = (s: string) => s.replace(/\r\n?/g, "\n");

const reviewSchema = z.object({
  bookingId: z.uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().transform(lineBreaks).pipe(z.string().trim().max(500)),
});

/**
 * Rates an attended booking of the account. The customer may change it until the owner answers;
 * the `owner_reply is null` guard on the upsert keeps that rule even when both act at once.
 */
export async function saveReview(
  userId: string,
  input: unknown,
  now: Date,
): Promise<SaveReviewResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { bookingId, rating, comment } = parsed.data;
  const [booking] = await db
    .select({ status: bookings.status })
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)));
  if (!booking) return { ok: false, error: "not_found" };
  if (booking.status !== "completed") return { ok: false, error: "not_completed" };
  const saved = await db
    .insert(reviews)
    .values({ bookingId, userId, rating, comment, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: reviews.bookingId,
      set: { rating, comment, updatedAt: now },
      setWhere: and(isNull(reviews.ownerReply), eq(reviews.userId, userId)),
    })
    .returning({ id: reviews.id });
  return saved.length > 0 ? { ok: true } : { ok: false, error: "already_replied" };
}

/** The account's review of one of its bookings, with the owner's answer when there is one. */
export async function getAccountReview(
  userId: string,
  bookingId: string,
): Promise<AccountReview | null> {
  if (!z.uuid().safeParse(bookingId).success) return null;
  const [row] = await db
    .select({
      rating: reviews.rating,
      comment: reviews.comment,
      ownerReply: reviews.ownerReply,
      repliedAt: reviews.repliedAt,
      updatedAt: reviews.updatedAt,
    })
    .from(reviews)
    .where(and(eq(reviews.bookingId, bookingId), eq(reviews.userId, userId)));
  return row ?? null;
}
