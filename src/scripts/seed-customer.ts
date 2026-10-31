import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

/**
 * Seed one dummy, already-confirmed customer so the sign-in form can be exercised
 * without a mail round trip.
 *
 * The account is written through the Local API with `overrideAccess`, exactly like
 * the register endpoint does, because the `customers` collection refuses public
 * creates. Payload hashes the password and creates the `salt`/`hash` pair; the
 * `_verified` write is direct because it is a Payload auth field with access
 * control. An unverified account cannot sign in.
 *
 * Idempotent: the address is deleted first, so running it twice replaces rather
 * than collides with the unique index on `email`.
 */

const EMAIL = process.env.SEED_CUSTOMER_EMAIL ?? 'dummy@unave.test'
const PASSWORD = process.env.SEED_CUSTOMER_PASSWORD ?? 'dummy-password-123'
const NAME = process.env.SEED_CUSTOMER_NAME ?? 'Dummy Customer'

const payload = await getPayload({ config })

await payload.delete({
  collection: 'customers',
  where: { email: { equals: EMAIL } },
})

const customer = await payload.create({
  collection: 'customers',
  data: {
    email: EMAIL,
    hasPassword: true,
    name: NAME,
    password: PASSWORD,
  },
  depth: 0,
  disableVerificationEmail: true,
  overrideAccess: true,
})

await payload.db.updateOne({
  collection: 'customers',
  data: { _verificationToken: null, _verified: true },
  id: customer.id,
})

payload.logger.info(`Seeded customer ${EMAIL} (id ${customer.id}).`)
payload.logger.info(`Sign in with password: ${PASSWORD}`)

process.exit(0)
