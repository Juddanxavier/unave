import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Customer accounts (spec 0005).
 *
 * Creates the `customers` auth collection with Payload's standard auth fields, the
 * `customers_sessions` table that `auth.useSessions` (default true) expects, and the
 * `subscriptions.customer_id` link.
 *
 * Column and index names mirror Payload's own conventions so a later
 * `payload migrate:create` against a clean database produces an equivalent, empty
 * diff rather than a second migration that renames everything.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_subscriptions_cancelled_by" ADD VALUE IF NOT EXISTS 'customer' BEFORE 'staff';

   CREATE TABLE "customers" (
   	"id" serial PRIMARY KEY NOT NULL,
   	"name" varchar,
   	"picture" varchar,
   	"google_id" varchar,
   	"last_login_at" timestamp(3) with time zone,
   	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
   	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
   	"email" varchar NOT NULL,
   	"reset_password_token" varchar,
   	"reset_password_expiration" timestamp(3) with time zone,
   	"salt" varchar,
   	"hash" varchar,
   	"reset_password_requested_at" timestamp(3) with time zone,
   	"login_attempts" numeric DEFAULT 0,
   	"lock_until" timestamp(3) with time zone
   );

   CREATE TABLE "customers_sessions" (
   	"_order" integer NOT NULL,
   	"_parent_id" integer NOT NULL,
   	"id" varchar PRIMARY KEY NOT NULL,
   	"created_at" timestamp(3) with time zone,
   	"expires_at" timestamp(3) with time zone NOT NULL
   );

   ALTER TABLE "subscriptions" ADD COLUMN "customer_id" integer;

   ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
   ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;

   CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
   CREATE UNIQUE INDEX "customers_google_id_idx" ON "customers" USING btree ("google_id");
   CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
   CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
   CREATE INDEX "customers_sessions_order_idx" ON "customers_sessions" USING btree ("_order");
   CREATE INDEX "customers_sessions_parent_id_idx" ON "customers_sessions" USING btree ("_parent_id");
   CREATE INDEX "subscriptions_customer_idx" ON "subscriptions" USING btree ("customer_id");

   -- Backfill only where exactly one customer owns the address, so an ambiguous
   -- match never links a plan to the wrong person. Every other plan keeps a null
   -- customer and needs a manual owner assignment.
   UPDATE "subscriptions" AS s
   SET "customer_id" = match."id"
   FROM (
   	SELECT lower(trim("email")) AS email, min("id") AS id, count(*) AS matches
   	FROM "customers"
   	GROUP BY lower(trim("email"))
   ) AS match
   WHERE s."customer_id" IS NULL
   	AND match.matches = 1
   	AND lower(trim(s."email")) = match.email;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Postgres cannot drop a value from an enum, so `customer` stays in
  // `enum_subscriptions_cancelled_by` after a rollback. Leaving it is harmless: no
  // row can hold it once the account page that writes it is gone.
  await db.execute(sql`
   DROP INDEX "subscriptions_customer_idx";
   ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_customer_id_customers_id_fk";
   ALTER TABLE "subscriptions" DROP COLUMN "customer_id";

   DROP TABLE "customers_sessions" CASCADE;
   DROP TABLE "customers" CASCADE;`)
}
