import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  admin_token: text("admin_token").notNull().unique(),
  admin_email: text("admin_email").notNull().default(""),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const teamSettings = pgTable("team_settings", {
  team_id: uuid("team_id")
    .primaryKey()
    .references(() => teams.id, { onDelete: "cascade" }),
  cadence: text("cadence").notNull().default("biweekly"),
  scale_max: integer("scale_max").notNull().default(3),
  min_responses_to_show: integer("min_responses_to_show").notNull().default(4),
  allow_free_text: boolean("allow_free_text").notNull().default(true),
});

export const questionBank = pgTable(
  "question_bank",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    team_id: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    category: text("category").notNull().default("general"),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_question_bank_team").on(table.team_id)]
);

export const questionSet = pgTable("question_set", {
  id: uuid("id").primaryKey().defaultRandom(),
  team_id: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  is_default: boolean("is_default").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const questionSetItem = pgTable("question_set_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  question_set_id: uuid("question_set_id")
    .notNull()
    .references(() => questionSet.id, { onDelete: "cascade" }),
  question_id: uuid("question_id")
    .notNull()
    .references(() => questionBank.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  kind: text("kind").notNull().default("fixed"),
});

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    team_id: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    question_set_id: uuid("question_set_id").references(
      () => questionSet.id,
      { onDelete: "set null" }
    ),
    token: text("token").notNull().unique(),
    status: text("status").notNull().default("open"),
    scale_max: integer("scale_max").notNull().default(3),
    opens_at: timestamp("opens_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    closes_at: timestamp("closes_at", { withTimezone: true, mode: "string" }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_rounds_team").on(table.team_id),
    index("idx_rounds_token").on(table.token),
  ]
);

export const roundQuestions = pgTable(
  "round_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    round_id: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    question_id: uuid("question_id")
      .notNull()
      .references(() => questionBank.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("fixed"),
    position: integer("position").notNull(),
  },
  (table) => [index("idx_round_questions_round").on(table.round_id)]
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    round_id: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    client_hash: text("client_hash"),
  },
  (table) => [index("idx_submissions_round").on(table.round_id)]
);

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submission_id: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    round_question_id: uuid("round_question_id")
      .notNull()
      .references(() => roundQuestions.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_answers_submission").on(table.submission_id)]
);

export const freeTextTable = pgTable("free_text", {
  id: uuid("id").primaryKey().defaultRandom(),
  submission_id: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const roundInsights = pgTable("round_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  round_id: uuid("round_id")
    .notNull()
    .references(() => rounds.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  content_md: text("content_md").notNull(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});
