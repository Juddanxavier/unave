import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Removes the guest plan link.
 *
 * The private emailed link, the page it opened and the resend form are gone from
 * the code, so the columns that stored the token hash and the sent-at stamp are
 * dead weight. The six `email_settings.access_link_*` copy columns go with them,
 * because the message they configured no longer exists.
 *
 * `enum_email_log_template_key` keeps its `accessLink` and `test` values. Postgres
 * cannot drop a value from an enum, and leaving them costs nothing: nothing writes
 * either value once this migration lands, and an old log row that carries one
 * still reads back fine.
 *
 * A plan is now reached through the account that owns it, so `subscriptions.customer_id`
 * is the only route in. Plans created before the guest link was removed that have a
 * null customer are unreachable and need a data decision outside this migration.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "subscriptions_access_token_hash_idx";

   ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "access_token_hash";
   ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "access_token_expires_at";
   ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "link_sent_at";

   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "access_link_subject";
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "access_link_heading";
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "access_link_intro";
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "access_link_button_label";
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "access_link_footer_note";
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "access_link_signature";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // The token columns come back empty. A rollback cannot restore the tokens that
  // were issued before the feature was removed, so every plan needs a fresh link
  // once the page is back.
  await db.execute(sql`
   ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "access_token_hash" varchar;
   ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "access_token_expires_at" timestamp(3) with time zone;
   ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "link_sent_at" timestamp(3) with time zone;

   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "access_link_subject" varchar;
   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "access_link_heading" varchar;
   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "access_link_intro" varchar;
   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "access_link_button_label" varchar;
   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "access_link_footer_note" varchar;
   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "access_link_signature" varchar;

   CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_access_token_hash_idx" ON "subscriptions" USING btree ("access_token_hash");`)
}
