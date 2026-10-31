import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The customer profile: phone, delivery address and food preference (spec 0005).
 *
 * Collected on the account page and offered at sign-up as a preference only. The
 * subscriptions table keeps its own per-plan copy — the profile is what checkout
 * prefills from later, not the record of what was delivered.
 *
 * Every step is guarded, because a database managed by dev push may already have
 * the columns by the time this migration runs. The enum type is created inside a
 * `DO` block that swallows the "already exists" error, which is the one guarded way
 * to create a type.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     CREATE TYPE "public"."enum_customers_food_preference" AS ENUM('none', 'vegetarian', 'vegan', 'eggetarian', 'non-vegetarian');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "phone" varchar;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address_line1" varchar;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address_line2" varchar;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address_city" varchar;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address_state" varchar;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "address_pincode" varchar;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "food_preference" "public"."enum_customers_food_preference" DEFAULT 'none';

   -- Carry the delivery details of each customer's most recent plan into their
   -- profile, so nobody retypes an address the subscriptions table already holds.
   -- A plan bought before the profile existed is exactly the case this serves.
   UPDATE "customers" AS c
   SET "phone" = latest."phone",
       "address_line1" = latest."address_line1",
       "address_line2" = latest."address_line2",
       "address_city" = latest."address_city",
       "address_state" = latest."address_state",
       "address_pincode" = latest."address_pincode"
   FROM (
     SELECT DISTINCT ON ("customer_id")
       "customer_id", "phone", "address_line1", "address_line2",
       "address_city", "address_state", "address_pincode"
     FROM "subscriptions"
     WHERE "customer_id" IS NOT NULL
     ORDER BY "customer_id", "created_at" DESC
   ) AS latest
   WHERE latest."customer_id" = c."id";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "food_preference";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "address_pincode";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "address_state";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "address_city";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "address_line2";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "address_line1";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "phone";

   DROP TYPE IF EXISTS "public"."enum_customers_food_preference";`)
}
