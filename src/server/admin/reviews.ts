import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.ts";
import { barbers, bookings, reviews, services, user } from "../db/schema.ts";

export type OwnerReview = {
  id: string;
  rating: number;
  comment: string;
  ownerReply: string | null;
  hidden: boolean;
  createdAt: Date;
  customerName: string;
  barberName: string;
  serviceName: string;
  bookingStartsAt: Date;
};

export type ReviewFilter = "todas" | "sin-responder";
export type OwnerReviewResult = { ok: true } | { ok: false; error: "invalid_input" | "not_found" };

const LIMIT = 100;
const unanswered = and(isNull(reviews.ownerReply), isNull(reviews.hiddenAt));

const replySchema = z.object({ reviewId: z.uuid(), reply: z.string().trim().min(1).max(500) });
const hiddenSchema = z.object({ reviewId: z.uuid(), hidden: z.enum(["0", "1"]) });

/** Reviews for the owner's "Opiniones" page, newest first. */
export async function listReviews(filter: ReviewFilter): Promise<OwnerReview[]> {
  return db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      ownerReply: reviews.ownerReply,
      hidden: sql<boolean>`${reviews.hiddenAt} is not null`,
      createdAt: reviews.createdAt,
      customerName: user.name,
      barberName: barbers.name,
      serviceName: services.name,
      bookingStartsAt: bookings.startsAt,
    })
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.userId))
    .innerJoin(bookings, eq(bookings.id, reviews.bookingId))
    .innerJoin(barbers, eq(barbers.id, bookings.barberId))
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .where(filter === "sin-responder" ? unanswered : undefined)
    .orderBy(desc(reviews.createdAt))
    .limit(LIMIT);
}

/** Visible reviews still waiting for the owner's answer, for the agenda notice. */
export async function countUnanswered(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(unanswered);
  return row.count;
}

/** Answers a review, or changes the answer. Once answered, the customer can no longer edit it. */
export async function replyToReview(input: unknown, now: Date): Promise<OwnerReviewResult> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const updated = await db
    .update(reviews)
    .set({ ownerReply: parsed.data.reply, repliedAt: now, updatedAt: now })
    .where(eq(reviews.id, parsed.data.reviewId))
    .returning({ id: reviews.id });
  return updated.length > 0 ? { ok: true } : { ok: false, error: "not_found" };
}

/** Hides a review that breaks the terms (or shows it again); hidden ones appear nowhere public. */
export async function setReviewHidden(input: unknown, now: Date): Promise<OwnerReviewResult> {
  const parsed = hiddenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const updated = await db
    .update(reviews)
    .set({ hiddenAt: parsed.data.hidden === "1" ? now : null, updatedAt: now })
    .where(eq(reviews.id, parsed.data.reviewId))
    .returning({ id: reviews.id });
  return updated.length > 0 ? { ok: true } : { ok: false, error: "not_found" };
}
