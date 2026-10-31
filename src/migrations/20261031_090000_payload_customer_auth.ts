import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Customer auth onto Payload's local strategy (spec 0005).
 *
 * The collection used to own its credentials: a `password_hash` column in a
 * `pbkdf2-sha256-v1:<salt>:<key>` format, an `email_verified_at` timestamp, and
 * one time token columns of its own. It now uses Payload's auth fields, so this
 * migration carries the data across rather than invalidating it.
 *
 * The hash format is deliberately the same construction Payload uses, so the
 * mapping is a split: Payload stores the salt on its own and expects the hash to
 * start at the key. A password that worked before this migration still works
 * after it.
 *
 * Every step is guarded, because a database that has only ever run the committed
 * migrations never had the custom columns in the first place. The `DO` block
 * checks `information_schema` before touching them.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "_verified" boolean;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "_verificationtoken" varchar;

   DO $$
   BEGIN
     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'password_hash'
     ) THEN
       UPDATE "customers"
       SET "salt" = split_part("password_hash", ':', 2),
           "hash" = 'pbkdf2-sha256-v1:' || split_part("password_hash", ':', 3)
       WHERE "password_hash" IS NOT NULL
         AND "password_hash" LIKE 'pbkdf2-sha256-v1:%';
     END IF;

     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'email_verified_at'
     ) THEN
       UPDATE "customers" SET "_verified" = ("email_verified_at" IS NOT NULL);
     END IF;
   END $$;

   ALTER TABLE "customers" ALTER COLUMN "login_attempts" SET DEFAULT 0;

   ALTER TABLE "customers" DROP COLUMN IF EXISTS "last_login_at";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "email_verified_at";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "password";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "password_hash";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "verify_token_hash";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "verify_email_sent_at";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "reset_token_hash";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "reset_token_expires_at";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Restore the shape the previous collection config declared, and map the
  // Payload fields back into the one time token columns it expects.
  await db.execute(sql`
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp(3) with time zone;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp(3) with time zone;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "password" varchar;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "password_hash" varchar;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "verify_token_hash" varchar;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "verify_email_sent_at" timestamp(3) with time zone;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "reset_token_hash" varchar;
   ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "reset_token_expires_at" timestamp(3) with time zone;

   UPDATE "customers"
   SET "email_verified_at" = CASE WHEN "_verified" THEN now() ELSE NULL END
   WHERE "_verified" IS NOT NULL;

   UPDATE "customers"
   SET "password_hash" = 'pbkdf2-sha256-v1:' || "salt" || ':' || split_part("hash", ':', 2)
   WHERE "salt" IS NOT NULL
     AND "hash" IS NOT NULL
     AND "hash" LIKE 'pbkdf2-sha256-v1:%';

   ALTER TABLE "customers" DROP COLUMN IF EXISTS "_verificationtoken";
   ALTER TABLE "customers" DROP COLUMN IF EXISTS "_verified";`)
}
