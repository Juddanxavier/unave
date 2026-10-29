import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Payload } from 'payload'

import { sendSystemMail, sendTemplateMail } from '../../src/email/send'

const mocks = vi.hoisted(() => ({
  sendSmtpMail: vi.fn(),
  sendZeptoMail: vi.fn(),
}))

vi.mock('../../src/email/transports/zeptomail', () => ({ sendZeptoMail: mocks.sendZeptoMail }))
vi.mock('../../src/email/transports/smtp', () => ({ sendSmtpMail: mocks.sendSmtpMail }))

type Row = Record<string, unknown> & { id: number }

const zeptoOk = { messageId: 'zepto-1', ok: true as const }
const zeptoRetryable = {
  code: 'EM_500',
  message: 'ZeptoMail rejected the message with HTTP 500.',
  ok: false as const,
  retryable: true,
}
const zeptoTerminal = {
  code: 'EM_122',
  message: 'ZeptoMail reported an invalid recipient.',
  ok: false as const,
  retryable: false,
}
const smtpOk = { messageId: '<smtp-1@test>', ok: true as const }
const smtpFail = {
  code: 'EENVELOPE',
  message: 'SMTP failed with EENVELOPE.',
  ok: false as const,
  retryable: true,
}

const makePayload = (settings: Record<string, unknown> = {}) => {
  const rows: Row[] = []
  const updates: Array<Record<string, unknown>> = []

  const payload = {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: rows.length + 1, ...data } as Row
      rows.push(row)
      return row
    }),
    findGlobal: vi.fn(async () => settings),
    logger: { error: vi.fn() },
    update: vi.fn(async (args: Record<string, unknown>) => {
      updates.push(args)
      return {}
    }),
  } as unknown as Payload

  return { payload, rows, updates }
}

const baseLink = {
  subscriptionId: 7,
  templateKey: 'accessLink' as const,
  to: 'guest@example.com',
  token: 'raw-token-value',
}

beforeEach(() => {
  mocks.sendZeptoMail.mockReset()
  mocks.sendSmtpMail.mockReset()

  process.env.NEXT_PUBLIC_SERVER_URL = 'https://unave.test'
  process.env.MAIL_FROM_ADDRESS = 'sender@unave.test'
  process.env.MAIL_FROM_NAME = 'Unave Default'
  process.env.MAIL_REPLY_TO = 'reply@unave.test'
  process.env.ZEPTOMAIL_API_KEY = 'send-token'
  process.env.ZEPTOMAIL_API_URL = 'https://api.zeptomail.test/v1.1/email'
  process.env.SMTP_HOST = 'smtp.test'
  process.env.SMTP_PORT = '587'
  process.env.SMTP_USER = 'smtp-user'
  process.env.SMTP_PASSWORD = 'smtp-pass'
  process.env.SMTP_SECURE = 'false'
})

afterEach(() => {
  for (const key of [
    'ZEPTOMAIL_API_KEY',
    'ZEPTOMAIL_API_URL',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_SECURE',
    'MAIL_FROM_ADDRESS',
    'MAIL_FROM_NAME',
    'MAIL_REPLY_TO',
  ]) {
    delete (process.env as Record<string, string | undefined>)[key]
  }
})

describe('template mail through ZeptoMail', () => {
  it('writes one sent row, returns the result and stamps the subscription', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload, rows, updates } = makePayload()

    const result = await sendTemplateMail(payload, {
      ...baseLink,
      recipientName: 'Priya\r\nBcc: evil@example.com',
      triggeredBy: 3,
    })

    expect(result).toEqual({
      fallbackUsed: false,
      messageId: 'zepto-1',
      status: 'sent',
      transport: 'zeptomail',
    })
    expect(mocks.sendSmtpMail).not.toHaveBeenCalled()

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      fallbackUsed: false,
      providerMessageId: 'zepto-1',
      recipient: 'guest@example.com',
      recipientMasked: 'g***@example.com',
      recipientName: 'Priya Bcc: evil@example.com',
      status: 'sent',
      subject: 'Your Unave plan link',
      subscription: 7,
      templateKey: 'accessLink',
      transport: 'zeptomail',
      triggeredBy: 3,
    })
    expect(typeof rows[0].sentAt).toBe('string')

    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({
      collection: 'subscriptions',
      context: {},
      data: { linkSentAt: expect.any(String) },
      depth: 0,
      id: 7,
      overrideAccess: true,
    })
  })

  it('builds the link from the server URL and the token only in the message body', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload, rows } = makePayload()

    await sendTemplateMail(payload, baseLink)

    const [, message] = mocks.sendZeptoMail.mock.calls[0]
    expect(message.html).toContain('https://unave.test/plan/raw-token-value')
    expect(message.text).toContain('https://unave.test/plan/raw-token-value')
    expect(JSON.stringify(rows[0])).not.toContain('raw-token-value')
  })

  it('uses the sender name and the copy stored in the settings global', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload } = makePayload({
      accessLink: { heading: 'Stored heading', intro: null, subject: 'Stored subject' },
      senderName: 'Unave Kitchen',
    })

    await sendTemplateMail(payload, baseLink)

    const [, message] = mocks.sendZeptoMail.mock.calls[0]
    expect(message.fromName).toBe('Unave Kitchen')
    expect(message.subject).toBe('Stored subject')
    expect(message.html).toContain('Stored heading')
    expect(message.html).not.toContain('Your plan is ready')
  })

  it('falls back to the environment sender name when the global has none', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload } = makePayload({ senderName: null })

    await sendTemplateMail(payload, baseLink)

    const [, message] = mocks.sendZeptoMail.mock.calls[0]
    expect(message.fromName).toBe('Unave Default')
    expect(message.fromAddress).toBe('sender@unave.test')
    expect(message.replyTo).toBe('reply@unave.test')
  })

  it('does not stamp the subscription for a test send', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload, updates } = makePayload()

    await sendTemplateMail(payload, { ...baseLink, subscriptionId: undefined, templateKey: 'test' })

    expect(updates).toHaveLength(0)
  })
})

describe('fallback and failure handling', () => {
  it('retries once over SMTP when ZeptoMail fails retryably', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoRetryable)
    mocks.sendSmtpMail.mockResolvedValue(smtpOk)
    const { payload, rows, updates } = makePayload()

    const result = await sendTemplateMail(payload, baseLink)

    expect(result).toEqual({
      fallbackUsed: true,
      messageId: '<smtp-1@test>',
      status: 'sent',
      transport: 'smtp',
    })
    expect(mocks.sendSmtpMail).toHaveBeenCalledTimes(1)
    expect(rows[0]).toMatchObject({
      fallbackUsed: true,
      providerMessageId: '<smtp-1@test>',
      status: 'sent',
      transport: 'smtp',
    })
    expect(updates).toHaveLength(1)
  })

  it('records the final error when both transports fail', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoRetryable)
    mocks.sendSmtpMail.mockResolvedValue(smtpFail)
    const { payload, rows, updates } = makePayload()

    const result = await sendTemplateMail(payload, baseLink)

    expect(result).toEqual({ fallbackUsed: true, status: 'failed', transport: 'smtp' })
    expect(rows[0]).toMatchObject({
      errorCode: 'EENVELOPE',
      errorMessage: 'ZeptoMail failed with EM_500. SMTP failed with EENVELOPE.',
      fallbackUsed: true,
      status: 'failed',
      transport: 'smtp',
    })
    expect(rows[0].sentAt).toBeUndefined()
    expect(updates).toHaveLength(0)
  })

  it('records a ZeptoMail failure without SMTP when the fallback is not configured', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoRetryable)
    delete (process.env as Record<string, string | undefined>).SMTP_HOST
    const { payload, rows } = makePayload()

    const result = await sendTemplateMail(payload, baseLink)

    expect(result).toEqual({ fallbackUsed: false, status: 'failed', transport: 'zeptomail' })
    expect(rows[0]).toMatchObject({ errorCode: 'EM_500', transport: 'zeptomail' })
    expect(mocks.sendSmtpMail).not.toHaveBeenCalled()
  })

  it('does not try SMTP when the provider names an invalid recipient', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoTerminal)
    const { payload, rows } = makePayload()

    const result = await sendTemplateMail(payload, baseLink)

    expect(result).toEqual({ fallbackUsed: false, status: 'failed', transport: 'none' })
    expect(rows[0]).toMatchObject({ errorCode: 'EM_122', transport: 'none' })
    expect(mocks.sendSmtpMail).not.toHaveBeenCalled()
  })

  it('refuses an invalid address before any transport and stores it as text', async () => {
    const { payload, rows } = makePayload()

    const result = await sendTemplateMail(payload, { ...baseLink, to: 'not-an-address' })

    expect(result).toEqual({ fallbackUsed: false, status: 'failed', transport: 'none' })
    expect(mocks.sendZeptoMail).not.toHaveBeenCalled()
    expect(mocks.sendSmtpMail).not.toHaveBeenCalled()
    expect(rows[0]).toMatchObject({
      errorCode: 'INVALID_RECIPIENT',
      recipient: 'not-an-address',
      status: 'failed',
    })
  })

  it('refuses an access link with no raw token', async () => {
    const { payload, rows } = makePayload()

    const result = await sendTemplateMail(payload, { ...baseLink, token: undefined })

    expect(result).toEqual({ fallbackUsed: false, status: 'failed', transport: 'none' })
    expect(mocks.sendZeptoMail).not.toHaveBeenCalled()
    expect(rows[0]).toMatchObject({ errorCode: 'MISSING_TOKEN' })
  })

  it('renders and logs a skipped send when no transport is configured', async () => {
    for (const key of [
      'ZEPTOMAIL_API_KEY',
      'SMTP_HOST',
      'MAIL_FROM_ADDRESS',
      'MAIL_REPLY_TO',
    ]) {
      delete process.env[key]
    }
    const { payload, rows } = makePayload()

    const result = await sendTemplateMail(payload, baseLink)

    expect(result).toEqual({ fallbackUsed: false, status: 'skipped', transport: 'none' })
    expect(mocks.sendZeptoMail).not.toHaveBeenCalled()
    expect(mocks.sendSmtpMail).not.toHaveBeenCalled()
    expect(rows[0]).toMatchObject({ status: 'skipped', transport: 'none' })
  })

  it('uses SMTP alone without flagging a fallback when ZeptoMail is not configured', async () => {
    delete (process.env as Record<string, string | undefined>).ZEPTOMAIL_API_KEY
    mocks.sendSmtpMail.mockResolvedValue(smtpOk)
    const { payload, rows } = makePayload()

    const result = await sendTemplateMail(payload, baseLink)

    expect(result).toEqual({
      fallbackUsed: false,
      messageId: '<smtp-1@test>',
      status: 'sent',
      transport: 'smtp',
    })
    expect(rows[0]).toMatchObject({ fallbackUsed: false, transport: 'smtp' })
  })
})

describe('system mail', () => {
  it('forces the environment sender and keeps the caller reply address', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload, rows } = makePayload({ senderName: 'Ignored Override' })

    await sendSystemMail(payload, {
      cc: ['cc@example.com'],
      html: '<p>Reset</p>',
      replyTo: 'support@unave.test',
      subject: 'Reset\r\nBcc: evil@example.com',
      text: 'Reset',
      to: 'User@Example.com',
    })

    const [, message] = mocks.sendZeptoMail.mock.calls[0]
    expect(message.fromAddress).toBe('sender@unave.test')
    expect(message.fromName).toBe('Unave Default')
    expect(message.replyTo).toBe('support@unave.test')
    expect(message.recipient).toBe('user@example.com')
    expect(message.subject).toBe('Reset Bcc: evil@example.com')
    expect(message.cc).toEqual(['cc@example.com'])
    expect(rows[0]).toMatchObject({ templateKey: 'system', transport: 'zeptomail' })
  })

  it('refuses attachments without calling a transport', async () => {
    const { payload, rows } = makePayload()

    const result = await sendSystemMail(payload, {
      attachments: [{ filename: 'note.txt' }],
      subject: 'With attachment',
      to: 'user@example.com',
    })

    expect(result).toEqual({ fallbackUsed: false, status: 'failed', transport: 'none' })
    expect(mocks.sendZeptoMail).not.toHaveBeenCalled()
    expect(rows[0]).toMatchObject({
      errorCode: 'ATTACHMENTS_UNSUPPORTED',
      templateKey: 'system',
    })
  })

  it('normalizes and validates a system recipient like template mail', async () => {
    const { payload, rows } = makePayload()

    const result = await sendSystemMail(payload, { subject: 'Bad', to: '  Nope  ' })

    expect(result).toEqual({ fallbackUsed: false, status: 'failed', transport: 'none' })
    expect(rows[0]).toMatchObject({ errorCode: 'INVALID_RECIPIENT', recipient: 'nope' })
  })

  it('uses a fixed subject when the caller sends none', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload, rows } = makePayload()

    await sendSystemMail(payload, { html: '<p>x</p>', to: 'user@example.com' })

    expect(rows[0].subject).toBe('(no subject)')
  })
})
