import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

// ── better-auth core tables (field names are fixed by the library) ─────────────
// `role` and `phone` are additional fields declared in src/server/auth.ts.
export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: text("role").notNull().default("customer"), // "owner" | "customer"
    phone: text("phone"), // "57" + 10 digits
    createdAt: tstz("created_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (t) => [check("user_role", sql`${t.role} in ('owner', 'customer')`)],
);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: tstz("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: tstz("access_token_expires_at"),
  refreshTokenExpiresAt: tstz("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: tstz("expires_at").notNull(),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

// ── enums ──────────────────────────────────────────────────────────────────────
export const bookingStatus = pgEnum("booking_status", [
  "held",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);
export const bookingPaymentMethod = pgEnum("booking_payment_method", ["cash", "transfer"]);
export const depositStatus = pgEnum("deposit_status", [
  "none",
  "pending",
  "paid",
  "applied",
  "transferred",
  "refund_pending",
  "refunded",
  "forfeited",
]);
export const cancelActor = pgEnum("cancel_actor", ["customer", "owner", "system"]);
export const paymentStatus = pgEnum("payment_status", [
  "PENDING",
  "APPROVED",
  "DECLINED",
  "VOIDED",
  "ERROR",
]);
export const saleKind = pgEnum("sale_kind", ["deposit", "balance", "walk_in", "refund"]);
export const moneyMethod = pgEnum("money_method", [
  "cash",
  "nequi",
  "daviplata",
  "card",
  "transfer",
  "wompi",
]);

// ── shop configuration ─────────────────────────────────────────────────────────
export const shopSettings = pgTable(
  "shop_settings",
  {
    id: smallint("id").primaryKey().default(1),
    name: text("name").notNull(),
    timezone: text("timezone").notNull().default("America/Bogota"),
    whatsappPhone: text("whatsapp_phone").notNull(),
    address: text("address").notNull().default(""),
    depositPercent: smallint("deposit_percent").notNull().default(100),
    selfServiceCutoffHours: smallint("self_service_cutoff_hours").notNull().default(4),
    holdMinutes: smallint("hold_minutes").notNull().default(15),
    slotIntervalMinutes: smallint("slot_interval_minutes").notNull().default(15),
    minNoticeMinutes: smallint("min_notice_minutes").notNull().default(60),
    maxAdvanceDays: smallint("max_advance_days").notNull().default(30),
    // Responsible party for Ley 1581 (shown on /privacidad and /terminos).
    legalName: text("legal_name").notNull().default(""),
    legalIdType: text("legal_id_type").notNull().default(""), // "CC" | "NIT" | ""
    legalIdNumber: text("legal_id_number").notNull().default(""),
    privacyEmail: text("privacy_email").notNull().default(""),
    // Loyalty card: attended visits needed for the reward (0 = off) and the reward's name.
    loyaltyGoal: smallint("loyalty_goal").notNull().default(10),
    loyaltyReward: text("loyalty_reward").notNull().default("Un corte gratis"),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("shop_settings_singleton", sql`${t.id} = 1`),
    check("shop_settings_deposit_percent", sql`${t.depositPercent} between 10 and 100`),
    check("shop_settings_cutoff_hours", sql`${t.selfServiceCutoffHours} between 3 and 5`),
    check("shop_settings_hold_minutes", sql`${t.holdMinutes} between 10 and 30`),
    check("shop_settings_loyalty_goal", sql`${t.loyaltyGoal} between 0 and 30`),
    check("shop_settings_loyalty_reward", sql`char_length(${t.loyaltyReward}) between 1 and 60`),
  ],
);

export const barbers = pgTable("barbers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: smallint("sort_order").notNull().default(0),
  createdAt: tstz("created_at").notNull().defaultNow(),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    durationMinutes: smallint("duration_minutes").notNull(),
    priceCop: integer("price_cop").notNull(),
    bufferAfterMinutes: smallint("buffer_after_minutes").notNull().default(0),
    active: boolean("active").notNull().default(true),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("services_duration", sql`${t.durationMinutes} between 10 and 240`),
    check("services_price", sql`${t.priceCop} > 0`),
    check("services_buffer", sql`${t.bufferAfterMinutes} between 0 and 60`),
  ],
);

export const workingHours = pgTable(
  "working_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    barberId: uuid("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(), // 0 = domingo … 6 = sábado
    startTime: time("start_time").notNull(), // wall clock in shop_settings.timezone
    endTime: time("end_time").notNull(),
  },
  (t) => [
    check("working_hours_weekday", sql`${t.weekday} between 0 and 6`),
    check("working_hours_range", sql`${t.endTime} > ${t.startTime}`),
    uniqueIndex("working_hours_barber_day_start").on(t.barberId, t.weekday, t.startTime),
  ],
);

export const timeOff = pgTable(
  "time_off",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = the whole shop is closed
    barberId: uuid("barber_id").references(() => barbers.id, { onDelete: "cascade" }),
    startsAt: tstz("starts_at").notNull(),
    endsAt: tstz("ends_at").notNull(),
    reason: text("reason").notNull().default(""),
  },
  (t) => [
    check("time_off_range", sql`${t.endsAt} > ${t.startsAt}`),
    index("time_off_starts_at").on(t.startsAt),
  ],
);

// ── customers and bookings ─────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(), // "57" + 10 digits
  consentAt: tstz("consent_at").notNull(), // Ley 1581 authorization
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    barberId: uuid("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    // The customer account that owns the booking; null for guests and deleted accounts.
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    startsAt: tstz("starts_at").notNull(),
    endsAt: tstz("ends_at").notNull(),
    blockedFrom: tstz("blocked_from").notNull(),
    blockedUntil: tstz("blocked_until").notNull(),
    status: bookingStatus("status").notNull(),
    paymentMethod: bookingPaymentMethod("payment_method").notNull(),
    priceCop: integer("price_cop").notNull(),
    depositCop: integer("deposit_cop").notNull().default(0),
    depositStatus: depositStatus("deposit_status").notNull().default("none"),
    manageTokenHash: text("manage_token_hash").notNull().unique(),
    holdExpiresAt: tstz("hold_expires_at"),
    rescheduledFromId: uuid("rescheduled_from_id").references((): AnyPgColumn => bookings.id),
    cancelledAt: tstz("cancelled_at"),
    cancelledBy: cancelActor("cancelled_by"),
    cancelReason: text("cancel_reason"),
    completedAt: tstz("completed_at"),
    createdAt: tstz("created_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("bookings_time_range", sql`${t.endsAt} > ${t.startsAt}`),
    check(
      "bookings_blocked_range",
      sql`${t.blockedFrom} <= ${t.startsAt} and ${t.blockedUntil} >= ${t.endsAt}`,
    ),
    check("bookings_deposit", sql`${t.depositCop} between 0 and ${t.priceCop}`),
    check("bookings_hold", sql`${t.status} <> 'held' or ${t.holdExpiresAt} is not null`),
    index("bookings_barber_starts").on(t.barberId, t.startsAt),
    index("bookings_customer").on(t.customerId),
    index("bookings_user").on(t.userId),
    index("bookings_status_hold").on(t.status, t.holdExpiresAt),
  ],
);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "restrict" }),
  reference: text("reference").notNull().unique(), // "BK-" + booking id
  amountCop: integer("amount_cop").notNull(),
  status: paymentStatus("status").notNull().default("PENDING"),
  wompiTransactionId: text("wompi_transaction_id").unique(),
  lastEventAt: tstz("last_event_at"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

// ── money ledger ───────────────────────────────────────────────────────────────
export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "restrict" }),
    barberId: uuid("barber_id").references(() => barbers.id, { onDelete: "set null" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    kind: saleKind("kind").notNull(),
    method: moneyMethod("method").notNull(),
    amountCop: integer("amount_cop").notNull(), // negative only for kind = 'refund'
    occurredAt: tstz("occurred_at").notNull().defaultNow(),
    note: text("note").notNull().default(""),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    check(
      "sales_amount_sign",
      sql`(${t.kind} = 'refund') = (${t.amountCop} < 0) and ${t.amountCop} <> 0`,
    ),
    uniqueIndex("sales_booking_kind")
      .on(t.bookingId, t.kind)
      .where(sql`${t.bookingId} is not null`),
    index("sales_occurred_at").on(t.occurredAt),
  ],
);

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: tstz("created_at").notNull().defaultNow(),
});

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id, { onDelete: "restrict" }),
    amountCop: integer("amount_cop").notNull(),
    spentOn: date("spent_on", { mode: "string" }).notNull(), // shop-local calendar day
    description: text("description").notNull().default(""),
    method: moneyMethod("method").notNull().default("cash"),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("expenses_amount", sql`${t.amountCop} > 0`),
    index("expenses_spent_on").on(t.spentOn),
  ],
);

// ── data-processing authorizations (Ley 1581: proof of consent) ────────────────
export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    kind: text("kind").notNull(), // "privacy" | "terms"
    version: text("version").notNull(),
    channel: text("channel").notNull(), // "registro" | "reserva" | "reacepta"
    acceptedAt: tstz("accepted_at").notNull().defaultNow(),
  },
  (t) => [
    check("consents_kind", sql`${t.kind} in ('privacy', 'terms')`),
    check("consents_channel", sql`${t.channel} in ('registro', 'reserva', 'reacepta')`),
    index("consents_user").on(t.userId),
  ],
);

// ── reviews: one rating per attended booking, answered by the owner ────────────
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    comment: text("comment").notNull().default(""),
    ownerReply: text("owner_reply"),
    repliedAt: tstz("replied_at"),
    hiddenAt: tstz("hidden_at"), // hidden by the owner for breaking the terms
    createdAt: tstz("created_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("reviews_rating", sql`${t.rating} between 1 and 5`),
    check("reviews_comment", sql`char_length(${t.comment}) <= 500`),
    check("reviews_owner_reply", sql`char_length(${t.ownerReply}) <= 500`),
    index("reviews_user").on(t.userId),
    index("reviews_created").on(t.createdAt),
  ],
);

// ── loyalty: each redemption spends a full card of stamps ──────────────────────
export const loyaltyRedemptions = pgTable(
  "loyalty_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stampsUsed: smallint("stamps_used").notNull(),
    redeemedAt: tstz("redeemed_at").notNull().defaultNow(),
    redeemedBy: text("redeemed_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    check("loyalty_redemptions_stamps", sql`${t.stampsUsed} between 1 and 30`),
    index("loyalty_redemptions_user").on(t.userId),
  ],
);
