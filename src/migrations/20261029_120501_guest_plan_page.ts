import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_subscriptions_cancelled_by" AS ENUM('guest', 'staff');
  ALTER TYPE "public"."enum_email_log_template_key" ADD VALUE 'cancellation' BEFORE 'test';
  ALTER TABLE "subscriptions" ADD COLUMN "cancelled_by" "enum_subscriptions_cancelled_by";
  ALTER TABLE "subscriptions" ADD COLUMN "cancellation_reason" varchar;
  ALTER TABLE "email_settings" ADD COLUMN "cancellation_subject" varchar;
  ALTER TABLE "email_settings" ADD COLUMN "cancellation_heading" varchar;
  ALTER TABLE "email_settings" ADD COLUMN "cancellation_intro" varchar;
  ALTER TABLE "email_settings" ADD COLUMN "cancellation_footer_note" varchar;
  ALTER TABLE "email_settings" ADD COLUMN "cancellation_signature" varchar;
  CREATE INDEX "email_status_idx" ON "subscriptions" USING btree ("email","status");
   UPDATE "subscriptions" SET "email" = lower(trim("email")) WHERE "email" IS NOT NULL AND "email" <> lower(trim("email"));
   UPDATE "subscriptions" SET "cancelled_by" = 'staff' WHERE "status" = 'cancelled' AND "cancelled_by" IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "email_log" ALTER COLUMN "template_key" SET DATA TYPE text;
  DROP TYPE "public"."enum_email_log_template_key";
  CREATE TYPE "public"."enum_email_log_template_key" AS ENUM('accessLink', 'test', 'system');
  ALTER TABLE "email_log" ALTER COLUMN "template_key" SET DATA TYPE "public"."enum_email_log_template_key" USING "template_key"::"public"."enum_email_log_template_key";
  DROP INDEX "email_status_idx";
  ALTER TABLE "subscriptions" DROP COLUMN "cancelled_by";
  ALTER TABLE "subscriptions" DROP COLUMN "cancellation_reason";
  ALTER TABLE "email_settings" DROP COLUMN "cancellation_subject";
  ALTER TABLE "email_settings" DROP COLUMN "cancellation_heading";
  ALTER TABLE "email_settings" DROP COLUMN "cancellation_intro";
  ALTER TABLE "email_settings" DROP COLUMN "cancellation_footer_note";
  ALTER TABLE "email_settings" DROP COLUMN "cancellation_signature";
  DROP TYPE "public"."enum_subscriptions_cancelled_by";`)
}
