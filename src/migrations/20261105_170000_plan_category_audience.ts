import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Plans carry a category and an audience (spec: the plans shelf).
 *
 * The category says how the meal reaches the customer — ready to cook, ready to
 * eat, or fresh from produce. The audience says who it is for — kids, adults, or
 * special. Both are required selects, shown as labels on the plan card.
 *
 * The columns are added nullable first and backfilled before `SET NOT NULL`,
 * because adding a not-null column without a default to a table that already has
 * rows is exactly what dev push refuses to do without deleting every row
 * (`truncate table "plans" cascade`). This way the three plans that existed
 * before the labels did keep their titles, prices and durations, and the kitchen
 * can correct the placeholder labels in the admin.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     CREATE TYPE "public"."enum_plans_category" AS ENUM('ready-to-cook', 'ready-to-eat', 'fresh-from-produce');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

   DO $$ BEGIN
     CREATE TYPE "public"."enum_plans_audience" AS ENUM('kids', 'adults', 'special');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

   ALTER TABLE "public"."plans" ADD COLUMN IF NOT EXISTS "category" "public"."enum_plans_category";
   ALTER TABLE "public"."plans" ADD COLUMN IF NOT EXISTS "audience" "public"."enum_plans_audience";

   UPDATE "public"."plans" SET "category" = 'ready-to-eat' WHERE "category" IS NULL;
   UPDATE "public"."plans" SET "audience" = 'adults' WHERE "audience" IS NULL;

   ALTER TABLE "public"."plans" ALTER COLUMN "category" SET NOT NULL;
   ALTER TABLE "public"."plans" ALTER COLUMN "audience" SET NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "public"."plans" ALTER COLUMN "audience" DROP NOT NULL;
   ALTER TABLE "public"."plans" ALTER COLUMN "category" DROP NOT NULL;
   ALTER TABLE "public"."plans" DROP COLUMN IF EXISTS "audience";
   ALTER TABLE "public"."plans" DROP COLUMN IF EXISTS "category";
   DROP TYPE IF EXISTS "public"."enum_plans_audience";
   DROP TYPE IF EXISTS "public"."enum_plans_category";
  `)
}
