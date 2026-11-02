import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * The plan card's points (spec 0007).
 *
 * Up to five short lines per plan, shown on the card under the description. An
 * array, so it lives in its own table with the parent id, like `plans_durations`
 * beside it. The step is guarded: a database managed by dev push may already
 * hold this table.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "plans_points" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "point" varchar NOT NULL
    );

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'plans_points_parent_id_fk'
      ) THEN
        ALTER TABLE "plans_points" ADD CONSTRAINT "plans_points_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "plans_points";
  `)
}
