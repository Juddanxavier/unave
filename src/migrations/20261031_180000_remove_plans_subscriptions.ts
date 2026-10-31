import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Remove the plan catalogue, subscriptions and payments (2026-10-31).
 *
 * The site stopped selling plans, so the three tables and their enum types go.
 * This drops data, not just schema: plans and subscriptions are deleted with
 * their rows and there is no backfill. Every statement is guarded because a dev
 * database managed by schema push may have dropped some of these already.
 *
 * The tables that earlier migrations created are dropped in dependency order:
 * payments first (it references subscriptions and plans), then subscriptions,
 * then plans. The down migration recreates nothing. Recovering the rows means
 * restoring a backup, which is the honest cost of wiping them.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "payments" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "subscriptions" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "plans" CASCADE;`)

  await db.execute(sql`DROP TYPE IF EXISTS "enum_payments_status" CASCADE;`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_payments_source" CASCADE;`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_subscriptions_status" CASCADE;`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_subscriptions_billing_period" CASCADE;`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_subscriptions_cancelled_by" CASCADE;`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_plans_billing_period" CASCADE;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Nothing to restore. The schema can be rebuilt by re-running the migrations
  // that created these tables, but the rows are gone.
  await db.execute(sql`SELECT 1;`)
}
