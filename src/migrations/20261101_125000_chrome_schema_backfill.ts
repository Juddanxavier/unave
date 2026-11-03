import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Backfills the chrome columns that only ever reached the dev schema.
 *
 * The announcement bar, the primary button group, the WhatsApp button and the
 * footer's contact details and link columns were added to the header and footer
 * globals while development was pushing its schema, so no migration ever
 * created their columns: on a database built by migrations the store chrome
 * migration crashes reading `header.announcement_enabled` (and the live site
 * would crash the same way on every read of either global).
 *
 * Every step is guarded, because a database managed by dev push already has all
 * of this. The filename sorts before the chrome data migration deliberately: it
 * must run first, or that migration reads globals whose columns are missing.
 *
 * The primary button columns arrive with a backfill instead of a default, so a
 * header edited before this point is not blanked out; the chrome migration that
 * runs after this one rewrites the stale subscription wording on its own.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_footer_columns_links_link_type" AS ENUM('reference', 'custom');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "announcement_enabled" boolean DEFAULT true;
    ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "announcement_text" varchar DEFAULT 'This week''s menu is live';
    ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "announcement_note" varchar DEFAULT 'The kitchen is taking orders';
    ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "announcement_link_label" varchar DEFAULT 'Message us';
    ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "announcement_link_url" varchar DEFAULT '/contact';
    ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "announcement_new_tab" boolean DEFAULT false;
    ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "whatsapp_number" varchar;
    ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "whatsapp_message" varchar;
    ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "cta_label" varchar;
    ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "cta_url" varchar;
    ALTER TABLE "header" ADD COLUMN IF NOT EXISTS "cta_new_tab" boolean DEFAULT false;
    UPDATE "header" SET "cta_label" = 'Message the kitchen', "cta_url" = '/contact' WHERE "cta_label" IS NULL OR "cta_url" IS NULL;
    ALTER TABLE "header" ALTER COLUMN "cta_label" SET NOT NULL;
    ALTER TABLE "header" ALTER COLUMN "cta_url" SET NOT NULL;

    ALTER TABLE "footer" ADD COLUMN IF NOT EXISTS "tagline" varchar DEFAULT 'Healthy, nutrition-conscious and diabetes-conscious meals, cooked in our kitchen and delivered on schedule.';
    ALTER TABLE "footer" ADD COLUMN IF NOT EXISTS "contact_phone" varchar;
    ALTER TABLE "footer" ADD COLUMN IF NOT EXISTS "contact_email" varchar;
    ALTER TABLE "footer" ADD COLUMN IF NOT EXISTS "contact_whatsapp" varchar;
    ALTER TABLE "footer" ADD COLUMN IF NOT EXISTS "contact_address" varchar;
    ALTER TABLE "footer" ADD COLUMN IF NOT EXISTS "notice" varchar DEFAULT 'Our meals are food options and are not a substitute for medical or nutritional advice.';
    ALTER TABLE "footer" ADD COLUMN IF NOT EXISTS "copyright" varchar DEFAULT '© UNAVE';

    CREATE TABLE IF NOT EXISTS "footer_columns" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "footer_columns_links" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "link_type" "public"."enum_footer_columns_links_link_type" DEFAULT 'reference',
      "link_new_tab" boolean,
      "link_url" varchar,
      "link_label" varchar NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "footer_columns_order_idx" ON "footer_columns" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "footer_columns_parent_id_idx" ON "footer_columns" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "footer_columns_links_order_idx" ON "footer_columns_links" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "footer_columns_links_parent_id_idx" ON "footer_columns_links" USING btree ("_parent_id");

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'footer_columns_parent_id_fk'
      ) THEN
        ALTER TABLE "footer_columns" ADD CONSTRAINT "footer_columns_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'footer_columns_links_parent_id_fk'
      ) THEN
        ALTER TABLE "footer_columns_links" ADD CONSTRAINT "footer_columns_links_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_columns"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "customers_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "enquiries_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "orders_id" integer;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_enquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("enquiries_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_customers_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk"
          FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_enquiries_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_enquiries_fk"
          FOREIGN KEY ("enquiries_id") REFERENCES "public"."enquiries"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_orders_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk"
          FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;

    ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "customers_id" integer;
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payload_preferences_rels_customers_fk'
      ) THEN
        ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk"
          FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "footer_columns_links";
    DROP TABLE IF EXISTS "footer_columns";

    ALTER TABLE "header" DROP COLUMN IF EXISTS "announcement_enabled";
    ALTER TABLE "header" DROP COLUMN IF EXISTS "announcement_text";
    ALTER TABLE "header" DROP COLUMN IF EXISTS "announcement_note";
    ALTER TABLE "header" DROP COLUMN IF EXISTS "announcement_link_label";
    ALTER TABLE "header" DROP COLUMN IF EXISTS "announcement_link_url";
    ALTER TABLE "header" DROP COLUMN IF EXISTS "announcement_new_tab";
    ALTER TABLE "header" DROP COLUMN IF EXISTS "whatsapp_number";
    ALTER TABLE "header" DROP COLUMN IF EXISTS "whatsapp_message";
    ALTER TABLE "header" DROP COLUMN IF EXISTS "cta_label";
    ALTER TABLE "header" DROP COLUMN IF EXISTS "cta_url";
    ALTER TABLE "header" DROP COLUMN IF EXISTS "cta_new_tab";

    ALTER TABLE "footer" DROP COLUMN IF EXISTS "tagline";
    ALTER TABLE "footer" DROP COLUMN IF EXISTS "contact_phone";
    ALTER TABLE "footer" DROP COLUMN IF EXISTS "contact_email";
    ALTER TABLE "footer" DROP COLUMN IF EXISTS "contact_whatsapp";
    ALTER TABLE "footer" DROP COLUMN IF EXISTS "contact_address";
    ALTER TABLE "footer" DROP COLUMN IF EXISTS "notice";
    ALTER TABLE "footer" DROP COLUMN IF EXISTS "copyright";

    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "customers_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "enquiries_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "orders_id";
    ALTER TABLE "payload_preferences_rels" DROP COLUMN IF EXISTS "customers_id";

    DROP TYPE IF EXISTS "public"."enum_footer_columns_links_link_type";
  `)
}
