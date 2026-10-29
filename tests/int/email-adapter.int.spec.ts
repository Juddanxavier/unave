import { beforeEach, describe, expect, it, vi } from 'vitest'

import { unaveEmailAdapter } from '../../src/email/adapter'

const mocks = vi.hoisted(() => ({ sendSystemMail: vi.fn() }))

vi.mock('../../src/email/send', () => ({ sendSystemMail: mocks.sendSystemMail }))

const payload = { collection: vi.fn() }
const adapter = unaveEmailAdapter({ payload } as never)

beforeEach(() => {
  mocks.sendSystemMail.mockReset()
  mocks.sendSystemMail.mockResolvedValue({
    fallbackUsed: false,
    messageId: 'adapter-1',
    status: 'sent',
    transport: 'zeptomail',
  })
})

describe('Payload email adapter', () => {
  it('passes the caller message to the system mail path and returns its result', async () => {
    const result = await adapter.sendEmail({
      attachments: [{ filename: 'note.txt' }],
      bcc: [{ address: 'bcc@example.com' }],
      cc: [{ address: 'cc@example.com' }],
      from: 'spoof@evil.test',
      html: '<p>Hello</p>',
      replyTo: [{ address: 'reply@example.com' }],
      subject: 'Hello',
      text: 'Hello',
      to: [{ address: 'guest@example.com' }],
    } as never)

    expect(result).toEqual({
      fallbackUsed: false,
      messageId: 'adapter-1',
      status: 'sent',
      transport: 'zeptomail',
    })

    const [call] = mocks.sendSystemMail.mock.calls
    expect(call[0]).toBe(payload)
    expect(call[1]).toEqual({
      attachments: [{ filename: 'note.txt' }],
      bcc: ['bcc@example.com'],
      cc: ['cc@example.com'],
      html: '<p>Hello</p>',
      replyTo: 'reply@example.com',
      subject: 'Hello',
      text: 'Hello',
      to: 'guest@example.com',
    })
    expect(call[1]).not.toHaveProperty('from')
  })

  it('accepts a single address object and a buffer body', async () => {
    await adapter.sendEmail({
      html: Buffer.from('<p>Buffered</p>'),
      subject: 'Buffered',
      text: Buffer.from('Buffered'),
      to: { address: 'guest@example.com' },
    } as never)

    const [, call] = mocks.sendSystemMail.mock.calls[0]
    expect(call.to).toBe('guest@example.com')
    expect(call.html).toBe('<p>Buffered</p>')
    expect(call.text).toBe('Buffered')
    expect(call.cc).toBeUndefined()
    expect(call.bcc).toBeUndefined()
    expect(call.replyTo).toBeUndefined()
  })

  it('reports the environment sender as the adapter default', () => {
    process.env.MAIL_FROM_ADDRESS = 'sender@unave.test'
    process.env.MAIL_FROM_NAME = 'Unave'

    const fresh = unaveEmailAdapter({ payload } as never)

    expect(fresh.defaultFromAddress).toBe('sender@unave.test')
    expect(fresh.defaultFromName).toBe('Unave')
    expect(fresh.name).toBe('unave')

    process.env.MAIL_FROM_ADDRESS = ''
    process.env.MAIL_FROM_NAME = ''
  })
})
