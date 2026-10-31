import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Razorpay checkout (spec 0007): the payments collection beside subscriptions
 * and the Razorpay order id on subscriptions. One order is one paid period;
 * renewal is a new order, so nothing else is needed. Every step is guarded,
 * because a database managed by dev push may already have the table by the time
 * this migration runs.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "payments" (
     "id" serial PRIMARY KEY NOT NULL,
     "razorpay_payment_id" varchar NOT NULL,
     "razorpay_order_id" varchar,
     "subscription_id" integer,
     "plan_id" integer,
     "amount" numeric NOT NULL,
     "currency" varchar DEFAULT 'INR' NOT NULL,
     "status" varchar NOT NULL,
     "method" varchar,
     "email" varchar,
     "contact" varchar,
     "source" varchar NOT NULL,
     "event_at" timestamp(3) with time zone,
     "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );`)

  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS "payments_razorpay_payment_id_unique" ON "payments" ("razorpay_payment_id");`,
  )
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "payments_razorpay_order_id_idx" ON "payments" ("razorpay_order_id");`,
  )
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "payments_subscription_id_idx" ON "payments" ("subscription_id");`,
  )

  await db.execute(
    sql`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "razorpay_order_id" varchar;`,
  )
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS "subscriptions_razorpay_order_id_idx" ON "subscriptions" ("razorpay_order_id");`,
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "subscriptions_razorpay_order_id_idx";`)
  await db.execute(sql`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "razorpay_order_id";`)
  await db.execute(sql`DROP INDEX IF EXISTS "payments_subscription_id_idx";`)
  await db.execute(sql`DROP INDEX IF EXISTS "payments_razorpay_order_id_idx";`)
  await db.execute(sql`DROP INDEX IF EXISTS "payments_razorpay_payment_id_unique";`)
  await db.execute(sql`DROP TABLE IF EXISTS "payments";`)
}
