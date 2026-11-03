# Deploying UNAVE

Production runs on one server as Docker, managed by Coolify. The database is
Postgres on the same server, not Neon: Neon stays where it belongs, in
development. This page is the whole runbook, from a bare server to a live site
at `https://unave.in`.

## The shape of it

| Piece | Where it runs | Notes |
| --- | --- | --- |
| The Next.js app | Docker container, port 3000 | Built from the repo `Dockerfile`, which needs `output: 'standalone'` in `next.config.ts` (already set) |
| Postgres 17 | Docker container on the same server | No published port; only the app reaches it. Tuned in `docker-compose.yml` for a 4 CPU, 8 GB box |
| Uploads | The `media` volume at `/app/public/media` | Survives redeploys. Move to object storage if the collection grows |
| The database the dev machines use | Neon | Never the production one, and never pointed at by `pnpm dev` |

Coolify is Docker with a management layer on top: reverse proxy, automatic
HTTPS, deploys on push, logs and env editing. Running the compose file by hand
with `docker compose up -d` works too; Coolify just removes the parts you would
otherwise build yourself, and on one small server that trade is worth it.

## Prepare the server

Ubuntu 24.04, 4 CPUs, 8 GB RAM:

1. Install Docker.
2. Add 4 GB of swap, because the image build can need several gigabytes in one
   moment:

   ```bash
   fallocate -l 4G /swapfile
   chmod 600 /swapfile
   mkswap /swapfile
   swapon /swapfile
   echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
   ```

3. Open ports 22, 80 and 443 in the firewall; nothing else needs to be public.
4. Point DNS at the server: `unave.in` and `www.unave.in` as A records.
5. Install Coolify with its install script and open its dashboard on port 8000.

## Deploy with Coolify

1. New resource, Docker Compose, from the GitHub repo, branch `master`.
   Coolify reads `docker-compose.yml` and builds the app and the database.
2. Set the environment in Coolify (or a `.env` it can read):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Anything; the compose file overrides it for the app with the on network URL |
   | `POSTGRES_PASSWORD` | A long random string |
   | `POSTGRES_USER`, `POSTGRES_DB` | `unave` for both is fine |
   | `PAYLOAD_SECRET` | A long random string |
   | `NEXT_PUBLIC_SERVER_URL` | `https://unave.in` |
   | `CRON_SECRET`, `PREVIEW_SECRET` | Random strings |
   | `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `MAIL_REPLY_TO` | The sender identity, required for any mail to leave |
   | `ZEPTOMAIL_API_KEY` or the `SMTP_*` group | One transport at least |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | For checkout |

   `NEXT_PUBLIC_SERVER_URL` is baked into the client bundles at build time, so
   it must be set before the first build, not after.
3. Give the `app` service the domain `https://unave.in` (and `www`) in Coolify,
   targeting port 3000. Coolify issues the certificates.
4. Deploy. The `migrate` service runs first and applies every migration in
   `src/migrations`; the app starts only after it succeeds. It is safe to repeat
   on every deploy.
5. Razorpay dashboard: set the webhook to
   `https://unave.in/api/razorpay/webhook` with `payment.captured`, auto
   capture on.
6. Visit `/admin`, create the first staff account, then fill in **Site chrome**
   (header, footer, contact email) and **Email settings**. The contact email in
   the footer is also the inbox every kitchen notice goes to.

## Housekeeping

**Payload jobs.** The daily `pruneEmailLog` task waits for a knock: Payload's
scheduler marks what is due, and something has to call the jobs endpoint for the
work to run. In Coolify, add an hourly scheduled task:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://unave.in/api/payload-jobs/run
```

Running it hourly is fine; the task itself decides it is due at 03:00 and runs
once a day.

**Backups.** The database is the only thing that cannot be rebuilt. Nightly,
from the host:

```bash
docker compose exec -T postgres pg_dump -U unave -Fc unave > /backups/unave-$(date +%F).dump
```

Keep dumps off the server as well (rclone to any object storage), and prune old
ones. To restore:

```bash
cat unave-2026-11-03.dump | docker compose exec -T postgres pg_restore -U unave -d unave --clean --if-exists
```

Snapshot the `media` volume with the same cadence, or copy `public/media`
alongside the dumps.

**Migrations.** New schema arrives as a guarded file in `src/migrations`
registered in `index.ts`; the compose `migrate` service applies it on the next
deploy. Development pushes its own schema with the dev server and is never
migrated; production only ever migrates.

## Moving content off Neon

Two paths, and the honest advice is to prefer the first:

1. **Fresh start.** Deploy, migrate, create content in the admin. The posts in
   the dev database are template filler, and the demo customer and order are
   test rows, so very little is worth carrying over.
2. **Carry the content over.** If real content already lives in Neon, dump the
   data and restore it into the migrated production schema:

   ```bash
   pg_dump --data-only --no-owner --no-privileges "$NEON_URL" > neon-data.sql
   ```

   Exclude the housekeeping tables, then restore inside the server:

   ```bash
   docker compose exec -T postgres psql -U unave -d unave \
     -c "CREATE SCHEMA IF NOT EXISTS neon_import;"
   # load the dump into neon_import, then move the rows across table by table
   ```

   Because the Neon schema was pushed by a dev server rather than built by the
   migrations, check column by column as you go, and verify row counts at the
   end. Treat the result as a draft and read it in the admin before going live.

## If the build runs out of memory

The image build is the only heavy moment on an 8 GB server. The 4 GB swap
usually absorbs it. If a deploy still fails while building, raise the swap to
6 GB or build the image elsewhere (GitHub Actions) and let Coolify deploy the
finished image instead.
