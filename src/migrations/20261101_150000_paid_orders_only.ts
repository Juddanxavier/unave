import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Only completed payments are recorded (spec 0007).
 *
 * An order row used to be born `pending` at checkout and flipped to `paid` by a
 * payment signal, which left abandoned checkouts behind. Now a row is written
 * only once a payment is captured, so the `status` column has nothing to say:
 * every row is a paid order. This migration removes the rows that never paid
 * and then drops the column and its enum.
 *
 * Every step is guarded, because a database managed by dev push may already
 * have lost the column.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'status'
      ) THEN
        DELETE FROM "orders" WHERE "status" = 'pending';
        ALTER TABLE "orders" DROP COLUMN "status";
      END IF;
    END $$;

    DROP TYPE IF EXISTS "public"."enum_orders_status";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_orders_status') THEN
        CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'paid');
      END IF;
    END $$;

    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "status" "public"."enum_orders_status" DEFAULT 'paid' NOT NULL;
  `)
}
