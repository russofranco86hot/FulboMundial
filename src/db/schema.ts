import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────
export const matchStatusEnum = pgEnum("match_status", ["open", "closed", "finished"]);
export const teamEnum = pgEnum("team_side", ["A", "B"]);
export const resultEnum = pgEnum("match_result", ["A", "B", "draw"]);
export const finalStatusEnum = pgEnum("final_status", ["playing", "substitute"]);
export const groupMemberRoleEnum = pgEnum("group_member_role", ["admin", "member"]);
export const groupMemberStatusEnum = pgEnum("group_member_status", ["active", "pending", "banned"]);
export const joinRequestStatusEnum = pgEnum("join_request_status", ["pending", "approved", "rejected"]);

// ─── players ──────────────────────────────────────────────────────────────
export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    // Ranking. Lower = higher priority. Ties allowed (e.g. JuanCe / Lucho).
    priorityOrder: integer("priority_order").notNull().default(999),
    isHistorico: boolean("is_historico").notNull().default(false),
    isGuest: boolean("is_guest").notNull().default(false),
    isGoalkeeper: boolean("is_goalkeeper").notNull().default(false),
    // 0..5, half-steps allowed.
    stars: numeric("stars", { precision: 3, scale: 1 }).notNull().default("0"),
    // Ajustes manuales del historial (el admin puede corregir G/E/P; pueden ser negativos).
    adjWon: integer("adj_won").notNull().default(0),
    adjDrawn: integer("adj_drawn").notNull().default(0),
    adjLost: integer("adj_lost").notNull().default(0),
    googleId: text("google_id"),
    email: text("email"),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    googleIdx: uniqueIndex("players_google_id_uniq").on(t.googleId),
  })
);

// ─── groups ───────────────────────────────────────────────────────────────
export const groups = pgTable(
  "groups",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(), // URL-friendly, ej: "futbol-miercoles"
    description: text("description"),
    format: text("format").notNull().default("F5"), // 'F5', 'F6', 'F7', 'F8', 'F11'
    defaultCapacity: integer("default_capacity").notNull().default(10),
    defaultDayOfWeek: integer("default_day_of_week"), // 0=Dom..6=Sáb, null=sin recurrencia fija
    defaultTime: text("default_time"), // "22:00"
    inviteCode: text("invite_code").notNull(), // código corto 6 chars
    createdBy: integer("created_by").references(() => players.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUniq: uniqueIndex("groups_slug_uniq").on(t.slug),
    inviteCodeUniq: uniqueIndex("groups_invite_code_uniq").on(t.inviteCode),
  })
);

// ─── group_members ────────────────────────────────────────────────────────
export const groupMembers = pgTable(
  "group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    role: groupMemberRoleEnum("role").notNull().default("member"),
    status: groupMemberStatusEnum("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("group_members_uniq").on(t.groupId, t.playerId),
    byGroup: index("group_members_group_idx").on(t.groupId),
    byPlayer: index("group_members_player_idx").on(t.playerId),
  })
);

// ─── join_requests ────────────────────────────────────────────────────────
export const joinRequests = pgTable(
  "join_requests",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    message: text("message"),
    status: joinRequestStatusEnum("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: integer("resolved_by").references(() => players.id, { onDelete: "set null" }),
  },
  (t) => ({
    byGroup: index("join_requests_group_idx").on(t.groupId),
    // Un jugador solo puede tener una solicitud pendiente por grupo
    uniqPending: uniqueIndex("join_requests_pending_uniq").on(t.groupId, t.playerId),
  })
);

// ─── matches ──────────────────────────────────────────────────────────────
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "cascade" }),
  matchDate: timestamp("match_date", { withTimezone: true }).notNull(),
  signupOpensAt: timestamp("signup_opens_at", { withTimezone: true }).notNull(),
  signupClosesAt: timestamp("signup_closes_at", { withTimezone: true }).notNull(),
  status: matchStatusEnum("status").notNull().default("open"),
  capacity: integer("capacity").notNull().default(10),
  format: text("format").notNull().default("F5"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── signups ──────────────────────────────────────────────────────────────
export const signups = pgTable(
  "signups",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    signupAt: timestamp("signup_at", { withTimezone: true }).notNull().defaultNow(),
    withdrawn: boolean("withdrawn").notNull().default(false),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    // Cacheado al cierre: titular o suplente.
    finalStatus: finalStatusEnum("final_status"),
  },
  (t) => ({
    uniq: uniqueIndex("signups_match_player_uniq").on(t.matchId, t.playerId),
    byMatch: index("signups_match_idx").on(t.matchId),
  })
);

// ─── teams ────────────────────────────────────────────────────────────────
export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    team: teamEnum("team").notNull(),
    playerId: integer("player_id").references(() => players.id, { onDelete: "set null" }),
    // Para invitados que no son players: guardamos nombre suelto.
    guestName: text("guest_name"),
    isGuest: boolean("is_guest").notNull().default(false),
  },
  (t) => ({
    byMatch: index("teams_match_idx").on(t.matchId),
  })
);

// ─── results ──────────────────────────────────────────────────────────────
export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  scoreA: integer("score_a").notNull().default(0),
  scoreB: integer("score_b").notNull().default(0),
  result: resultEnum("result").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── push_subscriptions ───────────────────────────────────────────────────
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id").references(() => players.id, { onDelete: "set null" }),
    endpoint: text("endpoint").notNull(),
    keys: jsonb("keys").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    endpointUniq: uniqueIndex("push_endpoint_uniq").on(t.endpoint),
  })
);

// ─── attendance_log ───────────────────────────────────────────────────────
export const attendanceLog = pgTable("attendance_log", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  attended: boolean("attended").notNull().default(true),
});

// ─── Tipos inferidos ──────────────────────────────────────────────────────
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type GroupMember = typeof groupMembers.$inferSelect;
export type JoinRequest = typeof joinRequests.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Signup = typeof signups.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Result = typeof results.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// ─── match_notes ──────────────────────────────────────────────────────────
export const matchNotes = pgTable("match_notes", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── match_votes ──────────────────────────────────────────────────────────
export const voteCategoryEnum = pgEnum("vote_category", ["mvp", "tronco", "gol"]);

export const matchVotes = pgTable(
  "match_votes",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    voterId: integer("voter_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    categoryId: voteCategoryEnum("category_id").notNull(),
    candidateId: integer("candidate_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Un jugador solo puede votar una vez por categoría en un partido
    uniqVote: uniqueIndex("match_votes_uniq").on(t.matchId, t.voterId, t.categoryId),
  })
);

// ─── match_third_half ─────────────────────────────────────────────────────
export const matchThirdHalf = pgTable(
  "match_third_half",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    staying: boolean("staying").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqPlayerMatch: uniqueIndex("match_third_half_uniq").on(t.matchId, t.playerId),
  })
);

export type MatchNote = typeof matchNotes.$inferSelect;
export type MatchVote = typeof matchVotes.$inferSelect;
export type MatchThirdHalf = typeof matchThirdHalf.$inferSelect;
