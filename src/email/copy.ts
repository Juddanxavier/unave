export type CancellationCopy = {
  footerNote: string
  heading: string
  intro: string
  signature: string
  subject: string
}

export const CANCELLATION_COPY_FIELDS = [
  'subject',
  'heading',
  'intro',
  'footerNote',
  'signature',
] as const

export const defaultCancellationCopy: CancellationCopy = {
  subject: 'Your Unave plan is cancelled',
  heading: 'Your plan has been cancelled',
  intro:
    'Your plan has stopped. If you have paid for time you will not use, our team will be in touch about a refund.',
  footerNote: 'If you did not ask for this, contact us right away.',
  signature: 'The Unave team',
}

const clean = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? value : undefined
}

/**
 * The cancellation copy merge. A stored field wins over the code default, and a
 * blank field is treated as absent, so an emptied textarea still falls back.
 */
export const mergeCancellationCopy = (
  stored?: Partial<Record<keyof CancellationCopy, string | null>> | null,
): CancellationCopy => {
  const merged = { ...defaultCancellationCopy }

  for (const field of CANCELLATION_COPY_FIELDS) {
    const value = clean(stored?.[field])
    if (value !== undefined) merged[field] = value
  }

  return merged
}
