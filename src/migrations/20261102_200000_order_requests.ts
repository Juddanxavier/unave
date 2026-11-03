import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Customers can ask the kitchen to stop or skip a plan (design.md §6.15).
 *
 * A paid order is the receipt and is never rewritten, so both asks are recorded
 * as their own row instead: one table holding the customer, the order, the kind of
 * ask, the days a pause covers and the status the kitchen works through. The
 * account writes it through a server action only, which is why no column here
 * stores anything the customer could change later.
 *
 * Every step is guarded, because a database managed by dev push already has the
 * table and `ADD CONSTRAINT` has no `IF NOT EXISTS`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     CREATE TYPE "public"."enum_order_requests_type" AS ENUM('cancel', 'pause');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

   DO $$ BEGIN
     CREATE TYPE "public"."enum_order_requests_status" AS ENUM('new', 'handled');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

   CREATE TABLE IF NOT EXISTS "order_requests" (
     "id" serial PRIMARY KEY NOT NULL,
     "customer_id" integer NOT NULL,
     "order_id" integer NOT NULL,
     "type" "public"."enum_order_requests_type" NOT NULL,
     "pause_from" timestamp(3) with time zone,
     "pause_to" timestamp(3) with time zone,
     "reason" varchar,
     "status" "public"."enum_order_requests_status" DEFAULT 'new',
     "staff_note" varchar,
     "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );

   CREATE INDEX IF NOT EXISTS "order_requests_customer_idx" ON "order_requests" ("customer_id");
   CREATE INDEX IF NOT EXISTS "order_requests_order_idx" ON "order_requests" ("order_id");
   CREATE INDEX IF NOT EXISTS "order_requests_status_idx" ON "order_requests" ("status");
   CREATE INDEX IF NOT EXISTS "order_requests_created_at_idx" ON "order_requests" ("created_at");
   CREATE INDEX IF NOT EXISTS "order_requests_updated_at_idx" ON "order_requests" ("updated_at");

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'order_requests_customer_id_customers_id_fk'
     ) THEN
       ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_customer_id_customers_id_fk"
         FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'order_requests_order_id_orders_id_fk'
     ) THEN
       ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_order_id_orders_id_fk"
         FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   -- The collection joins Payload's locking table like every other one; the
   -- table exists by now, so the foreign key here is safe to create.
   ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "order_requests_id" integer;
   CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_order_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("order_requests_id");
   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_order_requests_fk'
     ) THEN
       ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_order_requests_fk"
         FOREIGN KEY ("order_requests_id") REFERENCES "public"."order_requests"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;
`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "order_requests_id";
   DROP TABLE IF EXISTS "order_requests";
   DROP TYPE IF EXISTS "public"."enum_order_requests_type";
   DROP TYPE IF EXISTS "public"."enum_order_requests_status";`)
}
