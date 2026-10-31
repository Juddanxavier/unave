import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Email is compared in lowercase everywhere: the resend lookup, the compound
 * index and backfills. Trimming and lowercasing on write keeps the stored
 * value canonical. A missing email on update is left untouched.
 */
export const normalizeEmail: CollectionBeforeValidateHook = ({ data }) => {
  if (!data || typeof data.email !== 'string') return data

  return {
    ...data,
    email: data.email.trim().toLowerCase(),
  }
}
