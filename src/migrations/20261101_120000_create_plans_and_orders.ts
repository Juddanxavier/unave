import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The store comes back: `plans` and `orders` (spec 0007).
 *
 * The earlier commerce tables were dropped on 2026-10-31; this migration builds
 * the fresh shapes from nothing. Plans are the catalogue staff edit in the
 * admin; orders are the immutable purchase records the checkout endpoint
 * writes. The order status enum holds exactly two states, `pending` and `paid`,
 * because fulfilment states stay out of this pass.
 *
 * The same migration carries the `order` template key: a new value on the
 * email log's template enum, and the admin editable copy group on the email
 * settings global.
 *
 * Every step is guarded, because a database managed by dev push may already
 * hold some of these columns, and `ADD CONSTRAINT` has no `IF NOT EXISTS`. The
 * enum types are created inside `DO` blocks that swallow the "already exists"
 * error, which is the one guarded way to create a type.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'paid');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

   CREATE TABLE IF NOT EXISTS "plans" (
     "id" serial PRIMARY KEY NOT NULL,
     "title" varchar NOT NULL,
     "slug" varchar NOT NULL,
     "description" jsonb,
     "image_id" integer,
     "available" boolean DEFAULT true,
     "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );

   CREATE TABLE IF NOT EXISTS "plans_durations" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "label" varchar NOT NULL,
     "days" numeric NOT NULL,
     "price" numeric NOT NULL
   );

   CREATE TABLE IF NOT EXISTS "orders" (
     "id" serial PRIMARY KEY NOT NULL,
     "customer_id" integer NOT NULL,
     "delivery_name" varchar,
     "delivery_phone" varchar,
     "delivery_address_line1" varchar,
     "delivery_address_line2" varchar,
     "delivery_city" varchar,
     "delivery_state" varchar,
     "delivery_pincode" varchar,
     "delivery_food_preference" varchar,
     "delivery_note" varchar,
     "subtotal" numeric,
     "total" numeric,
     "status" "public"."enum_orders_status" DEFAULT 'pending' NOT NULL,
     "gateway_order_id" varchar,
     "gateway_payment_id" varchar,
     "gateway_signature" varchar,
     "paid_at" timestamp(3) with time zone,
     "starts_on" timestamp(3) with time zone,
     "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );

   CREATE TABLE IF NOT EXISTS "orders_items" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "plan_id" integer,
     "plan_title" varchar,
     "duration_label" varchar,
     "days" numeric,
     "unit_price" numeric
   );

   CREATE UNIQUE INDEX IF NOT EXISTS "plans_slug_idx" ON "plans" ("slug");
   CREATE UNIQUE INDEX IF NOT EXISTS "orders_gateway_order_id_idx" ON "orders" ("gateway_order_id");
   CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" ("status");
   CREATE INDEX IF NOT EXISTS "orders_customer_id_idx" ON "orders" ("customer_id");

   ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "image_id" integer;

   -- A database that ran an earlier copy of this migration already has the
   -- orders table without the delivery snapshot. Payload stores a group's
   -- fields as columns on the parent table, so these are added one by one and
   -- guarded; a fresh database gets them from CREATE TABLE above.
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_name" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_phone" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_address_line1" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_address_line2" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_city" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_state" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_pincode" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_food_preference" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_note" varchar;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'plans_image_id_media_id_fk'
     ) THEN
       ALTER TABLE "plans" ADD CONSTRAINT "plans_image_id_media_id_fk"
         FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'plans_durations_parent_id_fk'
     ) THEN
       ALTER TABLE "plans_durations" ADD CONSTRAINT "plans_durations_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'orders_customer_id_customers_id_fk'
     ) THEN
       ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk"
         FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'orders_items_parent_id_fk'
     ) THEN
       ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk"
         FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;

   DO $$ BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'orders_items_plan_id_plans_id_fk'
     ) THEN
       ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_plan_id_plans_id_fk"
         FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
     END IF;
   END $$;

   ALTER TYPE "public"."enum_email_log_template_key" ADD VALUE IF NOT EXISTS 'order';

   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "order_copy_confirmation_subject" varchar;
   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "order_copy_confirmation_intro" varchar;
   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "order_copy_confirmation_outro" varchar;
   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "order_copy_kitchen_subject" varchar;
   ALTER TABLE "email_settings" ADD COLUMN IF NOT EXISTS "order_copy_kitchen_intro" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "order_copy_kitchen_intro";
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "order_copy_kitchen_subject";
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "order_copy_confirmation_outro";
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "order_copy_confirmation_intro";
   ALTER TABLE "email_settings" DROP COLUMN IF EXISTS "order_copy_confirmation_subject";

   DROP TABLE IF EXISTS "orders_items";
   DROP TABLE IF EXISTS "orders";
   DROP TABLE IF EXISTS "plans_durations";
   DROP TABLE IF EXISTS "plans";

   DROP TYPE IF EXISTS "public"."enum_orders_status";

   -- The email log's template enum keeps the 'order' value. PostgreSQL cannot
   -- remove a value from an enum without rewriting the type, and an unused
   -- value in a select is harmless.`)
}
