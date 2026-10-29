import { describe, expect, it } from 'vitest'

import {
  COPY_FIELDS,
  defaultAccessLinkCopy,
  mergeAccessLinkCopy,
} from '../../src/email/copy'
import {
  isValidRecipient,
  maskRecipient,
  normalizeRecipientText,
  stripHeaderBreaks,
  toRecipientList,
  toRecipientText,
} from '../../src/email/recipient'

describe('recipient normalization', () => {
  it('trims and lowercases a recipient before any transport sees it', () => {
    expect(normalizeRecipientText('  Priya@Example.COM  ')).toBe('priya@example.com')
  })

  it('returns an empty string for a missing or non string value', () => {
    expect(normalizeRecipientText(undefined)).toBe('')
    expect(normalizeRecipientText(null)).toBe('')
    expect(normalizeRecipientText(42 as never)).toBe('')
  })
})

describe('recipient masking', () => {
  it('keeps the first character and the domain only', () => {
    expect(maskRecipient('priya@example.com')).toBe('p***@example.com')
  })

  it('masks an address with no domain down to the first character', () => {
    expect(maskRecipient('not-an-address')).toBe('n***')
  })

  it('never exposes the rest of the local part to staff', () => {
    expect(maskRecipient('a.very.long.name@example.com')).toBe('a***@example.com')
  })
})

describe('recipient validation', () => {
  it('accepts a normal address', () => {
    expect(isValidRecipient('guest@example.com')).toBe(true)
  })

  it('rejects an address with no domain or no dot in the domain', () => {
    expect(isValidRecipient('guest')).toBe(false)
    expect(isValidRecipient('guest@example')).toBe(false)
  })

  it('rejects spaces and empty values', () => {
    expect(isValidRecipient('gu est@example.com')).toBe(false)
    expect(isValidRecipient('')).toBe(false)
  })
})

describe('header break stripping', () => {
  it('replaces line feeds and carriage returns with a space', () => {
    expect(stripHeaderBreaks('Priya\r\nBcc: evil@example.com')).toBe('Priya Bcc: evil@example.com')
  })

  it('trims the result and handles missing values', () => {
    expect(stripHeaderBreaks('  Priya  ')).toBe('Priya')
    expect(stripHeaderBreaks(null)).toBe('')
  })
})

describe('address shape helpers', () => {
  it('reads a plain address string', () => {
    expect(toRecipientText('guest@example.com')).toBe('guest@example.com')
  })

  it('reads the first address of an array of objects', () => {
    expect(toRecipientText([{ address: 'guest@example.com' }, { address: 'other@example.com' }])).toBe(
      'guest@example.com',
    )
  })

  it('returns an empty string when there is no address', () => {
    expect(toRecipientText(undefined)).toBe('')
  })

  it('flattens cc and bcc shapes into plain strings', () => {
    expect(toRecipientList([{ address: 'a@example.com' }, 'b@example.com'])).toEqual([
      'a@example.com',
      'b@example.com',
    ])
  })

  it('returns undefined when no address is present', () => {
    expect(toRecipientList([])).toBeUndefined()
    expect(toRecipientList(undefined)).toBeUndefined()
  })
})

describe('access link copy', () => {
  it('exposes all six copy fields and a default for each', () => {
    expect(COPY_FIELDS).toHaveLength(6)
    for (const field of COPY_FIELDS) {
      expect(defaultAccessLinkCopy[field].length).toBeGreaterThan(0)
    }
  })

  it('uses the code defaults when nothing is stored', () => {
    expect(mergeAccessLinkCopy(undefined)).toEqual(defaultAccessLinkCopy)
    expect(mergeAccessLinkCopy(null)).toEqual(defaultAccessLinkCopy)
  })

  it('overrides one field and keeps defaults for the rest', () => {
    const merged = mergeAccessLinkCopy({ subject: 'Custom subject' })

    expect(merged.subject).toBe('Custom subject')
    expect(merged.heading).toBe(defaultAccessLinkCopy.heading)
    expect(merged.signature).toBe(defaultAccessLinkCopy.signature)
  })

  it('treats an empty or whitespace only field as absent', () => {
    const merged = mergeAccessLinkCopy({ intro: '', subject: '   ', heading: 'Only heading' })

    expect(merged.intro).toBe(defaultAccessLinkCopy.intro)
    expect(merged.subject).toBe(defaultAccessLinkCopy.subject)
    expect(merged.heading).toBe('Only heading')
  })
})
