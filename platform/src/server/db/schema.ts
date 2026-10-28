import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });

export const roleEnum = pgEnum("user_role", ["student", "instructor", "admin"]);
export const courseStatusEnum = pgEnum("course_status", ["draft", "in_review", "published", "archived"]);
export const levelEnum = pgEnum("course_level", ["beginner", "intermediate", "advanced", "all"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "awaiting_verification",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
]);
export const paymentProviderEnum = pgEnum("payment_provider", ["manual_mpesa", "manual_emola", "sandbox"]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", ["active", "revoked"]);
export const enrollmentSourceEnum = pgEnum("enrollment_source", ["purchase", "free", "grant"]);
export const tokenKindEnum = pgEnum("token_kind", ["verify_email", "reset_password"]);
export const applicationStatusEnum = pgEnum("application_status", ["pending", "approved", "rejected"]);

// ─── Identity ────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("student"),
    headline: text("headline"),
    bio: text("bio"),
    emailVerifiedAt: ts("email_verified_at"),
    disabledAt: ts("disabled_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    check("users_email_lowercase", sql`${t.email} = lower(${t.email})`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the cookie token; the raw token never touches the database.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: tokenKindEnum("kind").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("auth_tokens_hash_unique").on(t.tokenHash)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    email: text("email").notNull(),
    ip: text("ip"),
    success: boolean("success").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("login_attempts_email_idx").on(t.email, t.createdAt)],
);

// ─── Catalog ─────────────────────────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("categories_slug_unique").on(t.slug)],
);

export type FaqItem = { q: string; a: string };
export type Resource = { title: string; url: string };

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull().default(""),
    description: text("description").notNull().default(""),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    level: levelEnum("level").notNull().default("beginner"),
    language: text("language").notNull().default("pt"),
    priceCents: integer("price_cents").notNull().default(0),
    currency: text("currency").notNull().default("MZN"),
    status: courseStatusEnum("status").notNull().default("draft"),
    instructorId: uuid("instructor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    trailerYoutubeId: text("trailer_youtube_id"),
    outcomes: jsonb("outcomes").$type<string[]>().notNull().default([]),
    requirements: jsonb("requirements").$type<string[]>().notNull().default([]),
    audience: jsonb("audience").$type<string[]>().notNull().default([]),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    faq: jsonb("faq").$type<FaqItem[]>().notNull().default([]),
    project: text("project").notNull().default(""),
    coverSeed: integer("cover_seed").notNull().default(sql`floor(random() * 100000)::int`),
    featured: boolean("featured").notNull().default(false),
    reviewNote: text("review_note"),
    submittedAt: ts("submitted_at"),
    publishedAt: ts("published_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("courses_slug_unique").on(t.slug),
    index("courses_instructor_idx").on(t.instructorId),
    index("courses_status_idx").on(t.status),
    check("courses_price_range", sql`${t.priceCents} >= 0 AND ${t.priceCents} <= 100000000`),
    check("courses_currency_code", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check("courses_trailer_id", sql`${t.trailerYoutubeId} IS NULL OR ${t.trailerYoutubeId} ~ '^[A-Za-z0-9_-]{11}$'`),
  ],
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("modules_course_idx").on(t.courseId, t.position)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    body: text("body").notNull().default(""),
    task: text("task").notNull().default(""),
    youtubeVideoId: text("youtube_video_id"),
    videoSource: text("video_source"),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    isPreview: boolean("is_preview").notNull().default(false),
    resources: jsonb("resources").$type<Resource[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("lessons_module_idx").on(t.moduleId, t.position),
    index("lessons_course_idx").on(t.courseId),
    check("lessons_video_id", sql`${t.youtubeVideoId} IS NULL OR ${t.youtubeVideoId} ~ '^[A-Za-z0-9_-]{11}$'`),
    check("lessons_duration", sql`${t.durationSeconds} >= 0`),
  ],
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: smallint("correct_index").notNull(),
    explanation: text("explanation").notNull().default(""),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    index("quiz_questions_course_idx").on(t.courseId),
    check("quiz_correct_index", sql`${t.correctIndex} >= 0 AND ${t.correctIndex} < jsonb_array_length(${t.options})`),
  ],
);

// ─── Commerce ────────────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    provider: paymentProviderEnum("provider").notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    payerPhoneMasked: text("payer_phone_masked"),
    // Transaction ID from the wallet/gateway. Globally unique: one payment can only ever back one order.
    providerReference: text("provider_reference"),
    failureReason: text("failure_reason"),
    expiresAt: ts("expires_at").notNull(),
    submittedAt: ts("submitted_at"),
    paidAt: ts("paid_at"),
    refundedAt: ts("refunded_at"),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_reference_unique").on(t.reference),
    uniqueIndex("orders_provider_reference_unique").on(t.providerReference),
    // A student can have at most one open order per course; retries reuse it.
    uniqueIndex("orders_one_open_per_course")
      .on(t.userId, t.courseId)
      .where(sql`${t.status} IN ('pending', 'awaiting_verification')`),
    index("orders_status_idx").on(t.status, t.createdAt),
    index("orders_course_idx").on(t.courseId),
    check("orders_amount_positive", sql`${t.amountCents} > 0`),
    check("orders_currency_code", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check("orders_paid_has_time", sql`${t.status} NOT IN ('paid', 'refunded') OR ${t.paidAt} IS NOT NULL`),
  ],
);

// Append-only ledger of everything that happened to an order (enforced by a trigger in migrations).
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    type: text("type").notNull(),
    fromStatus: orderStatusEnum("from_status"),
    toStatus: orderStatusEnum("to_status"),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("payment_events_order_idx").on(t.orderId, t.id)],
);

// Deduplicates provider callbacks so a replayed webhook is harmless.
export const providerEvents = pgTable(
  "provider_events",
  {
    provider: paymentProviderEnum("provider").notNull(),
    eventId: text("event_id").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    receivedAt: ts("received_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.eventId] })],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    status: enrollmentStatusEnum("status").notNull().default("active"),
    source: enrollmentSourceEnum("source").notNull(),
    orderId: uuid("order_id").references((): AnyPgColumn => orders.id, { onDelete: "set null" }),
    grantedAt: ts("granted_at").notNull().defaultNow(),
    revokedAt: ts("revoked_at"),
    lastActivityAt: ts("last_activity_at"),
  },
  (t) => [
    uniqueIndex("enrollments_user_course_unique").on(t.userId, t.courseId),
    index("enrollments_course_idx").on(t.courseId, t.status),
  ],
);

export const wishlist = pgTable(
  "wishlist",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId] })],
);

// ─── Learning ────────────────────────────────────────────────────────────────

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    positionSeconds: integer("position_seconds").notNull().default(0),
    watchedSeconds: integer("watched_seconds").notNull().default(0),
    completedAt: ts("completed_at"),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.lessonId] }),
    index("lesson_progress_course_idx").on(t.courseId, t.userId),
    check("lesson_progress_non_negative", sql`${t.positionSeconds} >= 0 AND ${t.watchedSeconds} >= 0`),
  ],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<number[]>().notNull(),
    correctCount: integer("correct_count").notNull(),
    totalCount: integer("total_count").notNull(),
    scorePercent: smallint("score_percent").notNull(),
    passed: boolean("passed").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("quiz_attempts_user_course_idx").on(t.userId, t.courseId),
    check("quiz_attempts_score", sql`${t.scorePercent} BETWEEN 0 AND 100`),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("notes_user_lesson_unique").on(t.userId, t.lessonId)],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("questions_course_idx").on(t.courseId, t.createdAt)],
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("answers_question_idx").on(t.questionId, t.createdAt)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    body: text("body").notNull().default(""),
    hiddenAt: ts("hidden_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("reviews_user_course_unique").on(t.userId, t.courseId),
    check("reviews_rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);

export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    recipientName: text("recipient_name").notNull(),
    courseTitle: text("course_title").notNull(),
    instructorName: text("instructor_name").notNull(),
    scorePercent: smallint("score_percent"),
    issuedAt: ts("issued_at").notNull().defaultNow(),
    revokedAt: ts("revoked_at"),
    revokeReason: text("revoke_reason"),
  },
  (t) => [
    uniqueIndex("certificates_code_unique").on(t.code),
    uniqueIndex("certificates_user_course_unique").on(t.userId, t.courseId),
  ],
);

// ─── Operations ──────────────────────────────────────────────────────────────

export const instructorApplications = pgTable(
  "instructor_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").notNull().default("pending"),
    expertise: text("expertise").notNull(),
    motivation: text("motivation").notNull(),
    links: text("links").notNull().default(""),
    decisionNote: text("decision_note"),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
    decidedAt: ts("decided_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("instructor_applications_one_pending")
      .on(t.userId)
      .where(sql`${t.status} = 'pending'`),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_events_created_idx").on(t.createdAt)],
);

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    text: text("text").notNull(),
    html: text("html").notNull(),
    provider: text("provider").notNull(),
    providerId: text("provider_id"),
    error: text("error"),
    sentAt: ts("sent_at"),
    createdAt: createdAt(),
  },
  (t) => [index("email_outbox_created_idx").on(t.createdAt)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export type User = typeof users.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type Course = typeof courses.$inferSelect;
export type CourseStatus = (typeof courseStatusEnum.enumValues)[number];
export type CourseLevel = (typeof levelEnum.enumValues)[number];
export type Module = typeof modules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentProviderId = (typeof paymentProviderEnum.enumValues)[number];
export type Enrollment = typeof enrollments.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
