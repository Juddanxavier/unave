const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const stripHeaderBreaks = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim() : ''

export const normalizeRecipientText = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

export const isValidRecipient = (value: string): boolean => EMAIL_PATTERN.test(value)

/**
 * First character, three asterisks, then the domain. Kept deliberately simple
 * so the log never shows the full local part to staff.
 */
export const maskRecipient = (value: string): string => {
  const normalized = normalizeRecipientText(value)
  const at = normalized.lastIndexOf('@')

  if (at <= 0) {
    return `${normalized.slice(0, 1)}***`
  }

  return `${normalized.slice(0, 1)}***${normalized.slice(at)}`
}

const firstAddress = (value: unknown): string => {
  if (!value) return ''
  if (typeof value === 'string') return value

  if (Array.isArray(value)) {
    for (const entry of value) {
      const address = firstAddress(entry)
      if (address) return address
    }

    return ''
  }

  if (typeof value === 'object' && 'address' in value) {
    const address = (value as { address?: unknown }).address
    if (typeof address === 'string') return address
  }

  return ''
}

const collectAddresses = (value: unknown, found: string[]): void => {
  if (!value) return

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) found.push(trimmed)
    return
  }

  if (Array.isArray(value)) {
    for (const entry of value) collectAddresses(entry, found)
    return
  }

  if (typeof value === 'object' && 'address' in value) {
    const address = (value as { address?: unknown }).address
    if (typeof address === 'string' && address.trim()) found.push(address.trim())
  }
}

/** Turns Payload's or nodemailer's address shapes into one text value. */
export const toRecipientText = (value: unknown): string => firstAddress(value)

/** Turns Payload's or nodemailer's address shapes into plain strings for SMTP. */
export const toRecipientList = (value: unknown): string[] | undefined => {
  const found: string[] = []
  collectAddresses(value, found)

  return found.length > 0 ? found : undefined
}
