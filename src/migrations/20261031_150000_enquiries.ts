import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The enquiries collection: messages from the contact form (spec 0006).
 *
 * Every step is guarded, because a database managed by dev push may already have
 * the table by the time this migration runs.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "enquiries" (
     "id" serial PRIMARY KEY NOT NULL,
     "name" varchar NOT NULL,
     "email" varchar NOT NULL,
     "phone" varchar,
     "message" varchar NOT NULL,
     "handled" boolean DEFAULT false,
     "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "enquiries";`)
}
