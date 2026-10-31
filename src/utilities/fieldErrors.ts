import type { z } from 'zod'

export type FieldErrors = Record<string, string>

/**
 * One message per field, in the order the schema reports them, so a form with two
 * problems shows the first one against the field it belongs to rather than a single
 * banner that points at nothing.
 *
 * Shared by every form that validates with Zod on both sides of the network: the
 * auth screens and the account profile form.
 */
export const toFieldErrors = (error: z.ZodError): FieldErrors => {
  const fields: FieldErrors = {}

  for (const issue of error.issues) {
    const key = typeof issue.path[0] === 'string' ? issue.path[0] : 'form'
    fields[key] ??= issue.message
  }

  return fields
}
