import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Payload } from 'payload'

import { sendCustomerAuthMail, sendSystemMail } from '../../src/email/send'

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

/** Account security mail is the one template key the app still sends. */
const accountMail = {
  html: '<p>Confirm your address</p>',
  subject: 'Confirm your UNAVE address',
  text: 'Confirm your address',
  to: 'guest@example.com',
}

const systemMail = {
  html: '<p>New enquiry</p>',
  subject: 'New enquiry',
  text: 'New enquiry',
  to: 'guest@example.com',
}

beforeEach(() => {
  mocks.sendZeptoMail.mockReset()
  mocks.sendSmtpMail.mockReset()

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

describe('account mail through ZeptoMail', () => {
  it('writes one sent row and returns the result', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload, rows } = makePayload()

    const result = await sendCustomerAuthMail(payload, {
      ...accountMail,
      recipientName: 'Priya\r\nBcc: evil@example.com',
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
      subject: 'Confirm your UNAVE address',
      templateKey: 'customerAuth',
      transport: 'zeptomail',
    })
    expect(typeof rows[0].sentAt).toBe('string')
  })

  it('uses the environment sender when no transport is missing', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload } = makePayload({ senderName: null })

    await sendCustomerAuthMail(payload, accountMail)

    const [, message] = mocks.sendZeptoMail.mock.calls[0]
    expect(message.fromName).toBe('Unave Default')
    expect(message.fromAddress).toBe('sender@unave.test')
    expect(message.replyTo).toBe('reply@unave.test')
  })

  it('never files account mail against a plan', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload, rows } = makePayload()

    await sendCustomerAuthMail(payload, accountMail)

    expect(rows[0]).not.toHaveProperty('subscription')
  })
})

describe('fallback and failure handling', () => {
  it('retries once over SMTP when ZeptoMail fails retryably', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoRetryable)
    mocks.sendSmtpMail.mockResolvedValue(smtpOk)
    const { payload, rows } = makePayload()

    const result = await sendSystemMail(payload, systemMail)

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
  })

  it('records the final error when both transports fail', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoRetryable)
    mocks.sendSmtpMail.mockResolvedValue(smtpFail)
    const { payload, rows } = makePayload()

    const result = await sendSystemMail(payload, systemMail)

    expect(result).toEqual({ fallbackUsed: true, status: 'failed', transport: 'smtp' })
    expect(rows[0]).toMatchObject({
      errorCode: 'EENVELOPE',
      errorMessage: 'ZeptoMail failed with EM_500. SMTP failed with EENVELOPE.',
      fallbackUsed: true,
      status: 'failed',
      transport: 'smtp',
    })
    expect(rows[0].sentAt).toBeUndefined()
  })

  it('records a ZeptoMail failure without SMTP when the fallback is not configured', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoRetryable)
    delete (process.env as Record<string, string | undefined>).SMTP_HOST
    const { payload, rows } = makePayload()

    const result = await sendSystemMail(payload, systemMail)

    expect(result).toEqual({ fallbackUsed: false, status: 'failed', transport: 'zeptomail' })
    expect(rows[0]).toMatchObject({ errorCode: 'EM_500', transport: 'zeptomail' })
    expect(mocks.sendSmtpMail).not.toHaveBeenCalled()
  })

  it('does not try SMTP when the provider names an invalid recipient', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoTerminal)
    const { payload, rows } = makePayload()

    const result = await sendSystemMail(payload, systemMail)

    expect(result).toEqual({ fallbackUsed: false, status: 'failed', transport: 'none' })
    expect(rows[0]).toMatchObject({ errorCode: 'EM_122', transport: 'none' })
    expect(mocks.sendSmtpMail).not.toHaveBeenCalled()
  })

  it('refuses an invalid address before any transport and stores it as text', async () => {
    const { payload, rows } = makePayload()

    const result = await sendSystemMail(payload, { ...systemMail, to: 'not-an-address' })

    expect(result).toEqual({ fallbackUsed: false, status: 'failed', transport: 'none' })
    expect(mocks.sendZeptoMail).not.toHaveBeenCalled()
    expect(mocks.sendSmtpMail).not.toHaveBeenCalled()
    expect(rows[0]).toMatchObject({
      errorCode: 'INVALID_RECIPIENT',
      recipient: 'not-an-address',
      status: 'failed',
    })
  })

  it('logs a skipped send when no transport is configured', async () => {
    for (const key of [
      'ZEPTOMAIL_API_KEY',
      'SMTP_HOST',
      'MAIL_FROM_ADDRESS',
      'MAIL_REPLY_TO',
    ]) {
      delete process.env[key]
    }
    const { payload, rows } = makePayload()

    const result = await sendSystemMail(payload, systemMail)

    expect(result).toEqual({ fallbackUsed: false, status: 'skipped', transport: 'none' })
    expect(mocks.sendZeptoMail).not.toHaveBeenCalled()
    expect(mocks.sendSmtpMail).not.toHaveBeenCalled()
    expect(rows[0]).toMatchObject({ status: 'skipped', transport: 'none' })
  })

  it('uses SMTP alone without flagging a fallback when ZeptoMail is not configured', async () => {
    delete (process.env as Record<string, string | undefined>).ZEPTOMAIL_API_KEY
    mocks.sendSmtpMail.mockResolvedValue(smtpOk)
    const { payload, rows } = makePayload()

    const result = await sendSystemMail(payload, systemMail)

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

  it('records the admin who triggered a test send', async () => {
    mocks.sendZeptoMail.mockResolvedValue(zeptoOk)
    const { payload, rows } = makePayload()

    await sendSystemMail(payload, {
      html: '<p>Test</p>',
      subject: 'Unave test email',
      text: 'Test',
      to: 'admin@example.com',
      triggeredBy: 9,
    })

    expect(rows[0]).toMatchObject({ templateKey: 'system', triggeredBy: 9 })
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

  it('normalizes and validates a system recipient like account mail', async () => {
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
