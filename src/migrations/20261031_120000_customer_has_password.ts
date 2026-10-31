import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The account page's details card, which tells a Google-only account from one that
 * also signs in with email.
 *
 * Payload has no "has a password" flag: Google sign-in stores a random password so
 * the local strategy has something to hash, and nothing distinguishes it from a
 * password a customer chose. This column records the difference. It defaults to
 * false, and existing rows with no Google link are treated as password accounts,
 * which is how they were created.
 *
 * Both steps are guarded, so a database managed by `payload migrate` and one that
 * has only ever used dev push both end up in the same shape.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "has_password" boolean DEFAULT false;

   UPDATE "customers"
   SET "has_password" = true
   WHERE "has_password" = false
     AND "google_id" IS NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "has_password";`)
}
