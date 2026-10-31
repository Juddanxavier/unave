import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Payload } from 'payload'

import { defaultCancellationCopy, mergeCancellationCopy } from '../../src/email/copy'
import { sendTemplateMail } from '../../src/email/send'
import { renderCancellation } from '../../src/email/templates/render'

const mocks = vi.hoisted(() => ({
  sendSmtpMail: vi.fn(),
  sendZeptoMail: vi.fn(),
}))

vi.mock('../../src/email/transports/zeptomail', () => ({ sendZeptoMail: mocks.sendZeptoMail }))
vi.mock('../../src/email/transports/smtp', () => ({ sendSmtpMail: mocks.sendSmtpMail }))

type Row = Record<string, unknown> & { id: number }

const zeptoOk = { messageId: 'zepto-c', ok: true as const }

const makePayload = (settings: Record<string, unknown> = {}) => {
  const rows: Row[] = []
  const payload = {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: rows.length + 1, ...data } as Row
      rows.push(row)
      return row
    }),
    findGlobal: vi.fn(async () => settings),
    logger: { error: vi.fn() },
    update: vi.fn(async () => ({})),
  } as unknown as Payload

  return { payload, rows }
}

const baseCancellation = {
  cancelledAt: '2026-06-15T09:30:00.000Z',
  planTitle: 'Weekly Family Plan',
  recipientName: 'Priya',
  subscriptionId: 7,
  templateKey: 'cancellation' as const,
  to: 'guest@example.com',
}

beforeEach(() => {
  mocks.sendZeptoMail.mockReset()
  mocks.sendSmtpMail.mockReset()

  process.env.NEXT_PUBLIC_SERVER_URL = 'https://unave.test'
  process.env.MAIL_FROM_ADDRESS = 'sender@unave.test'
  process.env.MAIL_REPLY_TO = 'reply@unave.test'
  process.env.ZEPTOMAIL_API_KEY = 'send-token'
  process.env.ZEPTOMAIL_API_URL = 'https://api.zeptomail.test/v1.1/email'
})

afterEach(() => {
  for (const key of [
    'ZEPTOMAIL_API_KEY',
    'ZEPTOMAIL_API_URL',
    'MAIL_FROM_ADDRESS',
    'MAIL_REPLY_TO',
  ]) {
    delete (process.env as Record<string, string | undefined>)[key]
  }
})

describe('cancellation copy', () => {
  it('falls back to the code defaults', () => {
    expect(mergeCancellationCopy(undefined)).toEqual(defaultCancellationCopy)
    expect(mergeCancellationCopy({ subject: '   ', intro: null })).toEqual(defaultCancellationCopy)
  })

  it('overrides one field and keeps the rest', () => {
    const merged = mergeCancellationCopy({ subject: 'Gone' })

    expect(merged.subject).toBe('Gone')
    expect(merged.signature).toBe(defaultCancellationCopy.signature)
  })
})

describe('cancellation rendering', () => {
  it('names the plan, shows the date and links to contact', async () => {
    const { html, text } = await renderCancellation({
      cancelledAt: baseCancellation.cancelledAt,
      copy: defaultCancellationCopy,
      planTitle: 'Weekly Family Plan',
    })

    expect(html).toContain('Weekly Family Plan')
    expect(html).toContain('15 Jun 2026')
    expect(html).toContain('https://unave.test/contact')
    expect(text).toContain('Weekly Family Plan')
    expect(html).not.toContain('/plan/')
  })

  it('omits the date line when cancelledAt is null', async () => {
    const { html } = await renderCancellation({
      cancelledAt: null,
      copy: defaultCancellationCopy,
      planTitle: 'Weekly Family Plan',
    })

    expect(html).toContain('Weekly Family Plan')
    expect(html).not.toContain('Cancelled on')
  })

  it('escapes an inserted plan title', async () => {
    const { html } = await renderCancellation({
      copy: defaultCancellationCopy,
      planTitle: '<script>alert(1)</script>',
    })

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('cancellation send', () => {
  it('writes one sent row with the cancellation key and no token', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload, rows } = makePayload()

    const result = await sendTemplateMail(payload, {
      ...baseCancellation,
      recipientName: 'Priya\r\nBcc: evil@example.com',
    })

    expect(result).toEqual({
      fallbackUsed: false,
      messageId: 'zepto-c',
      status: 'sent',
      transport: 'zeptomail',
    })

    const [, message] = mocks.sendZeptoMail.mock.calls[0]
    expect(message.subject).toBe('Your Unave plan is cancelled')
    expect(message.recipientName).toBe('Priya Bcc: evil@example.com')
    expect(message.html).toContain('Weekly Family Plan')
    expect(message.html).toContain('https://unave.test/contact')

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      recipient: 'guest@example.com',
      status: 'sent',
      subject: 'Your Unave plan is cancelled',
      subscription: 7,
      templateKey: 'cancellation',
      transport: 'zeptomail',
    })
    expect(JSON.stringify(rows[0])).not.toContain('/plan/')
  })

  it('uses the stored cancellation copy over the defaults', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload } = makePayload({
      cancellation: { heading: 'Stored cancellation', subject: 'Stored subject' },
    })

    await sendTemplateMail(payload, baseCancellation)

    const [, message] = mocks.sendZeptoMail.mock.calls[0]
    expect(message.subject).toBe('Stored subject')
    expect(message.html).toContain('Stored cancellation')
    expect(message.html).not.toContain(defaultCancellationCopy.heading)
  })

  it('records a skipped row with no configured transport', async () => {
    delete (process.env as Record<string, string | undefined>).ZEPTOMAIL_API_KEY
    const { payload, rows } = makePayload()

    const result = await sendTemplateMail(payload, baseCancellation)

    expect(result).toEqual({ fallbackUsed: false, status: 'skipped', transport: 'none' })
    expect(rows[0]).toMatchObject({ status: 'skipped', templateKey: 'cancellation' })
  })
})
