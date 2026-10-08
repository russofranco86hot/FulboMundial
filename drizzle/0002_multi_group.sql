-- Migración: Transformación a plataforma multi-grupo
-- Crea las tablas de grupos, miembros y solicitudes; agrega groupId a matches.

-- Nuevos enums
CREATE TYPE "public"."group_member_role" AS ENUM('admin', 'member');
--> statement-breakpoint
CREATE TYPE "public"."group_member_status" AS ENUM('active', 'pending', 'banned');
--> statement-breakpoint
CREATE TYPE "public"."join_request_status" AS ENUM('pending', 'approved', 'rejected');
--> statement-breakpoint

-- Tabla groups
CREATE TABLE IF NOT EXISTS "groups" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "format" text NOT NULL DEFAULT 'F5',
  "default_capacity" integer NOT NULL DEFAULT 10,
  "default_day_of_week" integer,
  "default_time" text,
  "invite_code" text NOT NULL,
  "created_by" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Tabla group_members
CREATE TABLE IF NOT EXISTS "group_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "group_id" integer NOT NULL,
  "player_id" integer NOT NULL,
  "role" "group_member_role" NOT NULL DEFAULT 'member',
  "status" "group_member_status" NOT NULL DEFAULT 'active',
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Tabla join_requests
CREATE TABLE IF NOT EXISTS "join_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "group_id" integer NOT NULL,
  "player_id" integer NOT NULL,
  "message" text,
  "status" "join_request_status" NOT NULL DEFAULT 'pending',
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  "resolved_by" integer
);
--> statement-breakpoint

-- Columnas nuevas en matches
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "group_id" integer;
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "format" text NOT NULL DEFAULT 'F5';
--> statement-breakpoint

-- FKs groups
DO $$ BEGIN
 ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_players_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- FKs group_members
DO $$ BEGIN
 ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_members" ADD CONSTRAINT "group_members_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- FKs join_requests
DO $$ BEGIN
 ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_resolved_by_players_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- FK matches -> groups
DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Índices únicos
CREATE UNIQUE INDEX IF NOT EXISTS "groups_slug_uniq" ON "groups" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "groups_invite_code_uniq" ON "groups" USING btree ("invite_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "group_members_uniq" ON "group_members" USING btree ("group_id","player_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_members_group_idx" ON "group_members" USING btree ("group_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "group_members_player_idx" ON "group_members" USING btree ("player_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "join_requests_group_idx" ON "join_requests" USING btree ("group_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "join_requests_pending_uniq" ON "join_requests" USING btree ("group_id","player_id");
--> statement-breakpoint

-- Seed: crear el grupo pionero "Fútbol de los Miércoles"
-- y asignar todos los matches existentes a ese grupo.
INSERT INTO "groups" ("name", "slug", "description", "format", "default_capacity", "default_day_of_week", "default_time", "invite_code")
VALUES ('Fútbol de los Miércoles', 'futbol-miercoles', 'El fútbol 5 de los miércoles a las 22hs.', 'F5', 10, 3, '22:00', 'FULB01')
ON CONFLICT DO NOTHING;

UPDATE "matches" SET "group_id" = (SELECT id FROM "groups" WHERE slug = 'futbol-miercoles') WHERE "group_id" IS NULL;
