export type AccessLinkCopy = {
  buttonLabel: string
  footerNote: string
  heading: string
  intro: string
  signature: string
  subject: string
}

export const COPY_FIELDS = [
  'subject',
  'heading',
  'intro',
  'buttonLabel',
  'footerNote',
  'signature',
] as const

export const defaultAccessLinkCopy: AccessLinkCopy = {
  subject: 'Your Unave plan link',
  heading: 'Your plan is ready',
  intro: 'Use the link below to open your plan. The link works for 7 days.',
  buttonLabel: 'Open my plan',
  footerNote: 'If you did not ask for this, you can ignore this message.',
  signature: 'The Unave team',
}

const clean = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? value : undefined
}

/**
 * Stored copy wins over the code default per field. A blank field is treated
 * as absent, so an emptied textarea always falls back to the default.
 */
export const mergeAccessLinkCopy = (
  stored?: Partial<Record<keyof AccessLinkCopy, string | null>> | null,
): AccessLinkCopy => {
  const merged = { ...defaultAccessLinkCopy }

  for (const field of COPY_FIELDS) {
    const value = clean(stored?.[field])
    if (value !== undefined) merged[field] = value
  }

  return merged
}
