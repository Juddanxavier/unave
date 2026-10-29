import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendSmtpMail } from '../../src/email/transports/smtp'
import { sendZeptoMail } from '../../src/email/transports/zeptomail'

const zeptoConfig = { apiKey: 'secret-send-token', apiUrl: 'https://api.zeptomail.test/v1.1/email' }

const message = {
  bcc: ['bcc@example.com'],
  cc: ['cc@example.com'],
  fromAddress: 'sender@unave.test',
  fromName: 'Unave',
  html: '<p>Hello</p>',
  recipient: 'guest@example.com',
  recipientName: 'Guest',
  replyTo: 'reply@unave.test',
  subject: 'Your link',
  text: 'Hello',
}

const reply = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
})

describe('ZeptoMail transport', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the mapped body and auth header and returns the request id', async () => {
    fetchMock.mockResolvedValue(reply(200, { request_id: 'req-1', data: [] }))

    const result = await sendZeptoMail(zeptoConfig, message)

    expect(result).toEqual({ messageId: 'req-1', ok: true })

    const [url, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)

    expect(url).toBe(zeptoConfig.apiUrl)
    expect(init.headers.Authorization).toBe('Zoho-enczapikey secret-send-token')
    expect(body.from).toEqual({ address: 'sender@unave.test', name: 'Unave' })
    expect(body.to).toEqual([
      { email_address: { address: 'guest@example.com', name: 'Guest' } },
    ])
    expect(body.reply_to).toEqual([{ address: 'reply@unave.test' }])
    expect(body.cc).toEqual([{ email_address: { address: 'cc@example.com' } }])
    expect(body.bcc).toEqual([{ email_address: { address: 'bcc@example.com' } }])
    expect(body.subject).toBe('Your link')
    expect(body.htmlbody).toBe('<p>Hello</p>')
    expect(body.textbody).toBe('Hello')
  })

  it('falls back to the message id inside the data array', async () => {
    fetchMock.mockResolvedValue(reply(200, { data: [{ message_id: 'data-id' }] }))

    const result = await sendZeptoMail(zeptoConfig, message)

    expect(result).toEqual({ messageId: 'data-id', ok: true })
  })

  it('treats a 5xx as retryable and keeps the provider code', async () => {
    fetchMock.mockResolvedValue(reply(500, { error: { code: 'EM_500', message: 'Server error' } }))

    const result = await sendZeptoMail(zeptoConfig, message)

    expect(result).toMatchObject({ code: 'EM_500', ok: false, retryable: true })
    if (result.ok) throw new Error('expected a failure')
    expect(result.message).not.toContain('secret-send-token')
  })

  it('treats a 401 as retryable', async () => {
    fetchMock.mockResolvedValue(reply(401, { error: { code: 'EM_401' } }))

    await expect(sendZeptoMail(zeptoConfig, message)).resolves.toMatchObject({
      code: 'EM_401',
      ok: false,
      retryable: true,
    })
  })

  it('treats a 400 that names an invalid recipient as terminal', async () => {
    fetchMock.mockResolvedValue(
      reply(400, { data: [{ error_code: 'EM_122' }], error: { code: 'EM_122' } }),
    )
    const body = reply(400, { error: { code: 'EM_122', message: 'Invalid recipient email address' } })
    fetchMock.mockResolvedValue(body)

    const result = await sendZeptoMail(zeptoConfig, message)

    expect(result).toMatchObject({ code: 'EM_122', ok: false, retryable: false })
  })

  it('treats a 400 that does not name an invalid recipient as retryable', async () => {
    fetchMock.mockResolvedValue(reply(400, { error: { code: 'EM_400', message: 'Bad request' } }))

    await expect(sendZeptoMail(zeptoConfig, message)).resolves.toMatchObject({
      code: 'EM_400',
      retryable: true,
    })
  })

  it('reports a network failure as retryable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(sendZeptoMail(zeptoConfig, message)).resolves.toMatchObject({
      code: 'ZEPTOMAIL_NETWORK',
      ok: false,
      retryable: true,
    })
  })

  it('reports a timeout as retryable', async () => {
    const timeout = new Error('timed out')
    timeout.name = 'TimeoutError'
    fetchMock.mockRejectedValue(timeout)

    await expect(sendZeptoMail(zeptoConfig, message)).resolves.toMatchObject({
      code: 'ZEPTOMAIL_TIMEOUT',
      retryable: true,
    })
  })

  it('falls back to the status code when the provider sends no usable code', async () => {
    fetchMock.mockResolvedValue(reply(503, { message: 'unavailable' }))

    await expect(sendZeptoMail(zeptoConfig, message)).resolves.toMatchObject({
      code: 'ZEPTOMAIL_503',
    })
  })
})

const smtpConfig = {
  host: 'smtp.test',
  password: 'smtp-secret',
  port: 587,
  secure: false,
  user: 'smtp-user',
}

const mailer = vi.hoisted(() => {
  const sendMail = vi.fn()
  const close = vi.fn()
  const createTransport = vi.fn((_config: Record<string, unknown>) => ({ close, sendMail }))
  return { close, createTransport, sendMail }
})

vi.mock('nodemailer', () => ({ default: { createTransport: mailer.createTransport } }))

describe('SMTP transport', () => {
  beforeEach(() => {
    mailer.sendMail.mockReset()
    mailer.close.mockReset()
    mailer.createTransport.mockClear()
  })

  it('sends the mapped message and closes the transporter', async () => {
    mailer.sendMail.mockResolvedValue({ messageId: '<smtp-id@test>' })

    const result = await sendSmtpMail(smtpConfig, message)

    expect(result).toEqual({ messageId: '<smtp-id@test>', ok: true })
    expect(mailer.close).toHaveBeenCalledTimes(1)

    const [options] = mailer.sendMail.mock.calls[0]
    expect(options.from).toEqual({ address: 'sender@unave.test', name: 'Unave' })
    expect(options.to).toEqual({ address: 'guest@example.com', name: 'Guest' })
    expect(options.replyTo).toBe('reply@unave.test')
    expect(options.subject).toBe('Your link')
    expect(options.html).toBe('<p>Hello</p>')
    expect(options.text).toBe('Hello')

    const [config] = mailer.createTransport.mock.calls[0]
    expect(config).toMatchObject({ host: 'smtp.test', port: 587, secure: false })
  })

  it('classifies a provider rejection by code and closes the transporter', async () => {
    const error = Object.assign(new Error('rejected'), { code: 'EENVELOPE' })
    mailer.sendMail.mockRejectedValue(error)

    const result = await sendSmtpMail(smtpConfig, message)

    expect(result).toMatchObject({ code: 'EENVELOPE', ok: false, retryable: true })
    if (result.ok) throw new Error('expected a failure')
    expect(result.message).not.toContain('smtp-secret')
    expect(result.message).not.toContain('guest@example.com')
    expect(mailer.close).toHaveBeenCalledTimes(1)
  })

  it('falls back to SMTP_ERROR when the rejection has no usable code', async () => {
    mailer.sendMail.mockRejectedValue(new Error('socket hang up'))

    await expect(sendSmtpMail(smtpConfig, message)).resolves.toMatchObject({
      code: 'SMTP_ERROR',
    })
  })

  it('gives up after the 15 second overall deadline', async () => {
    vi.useFakeTimers()
    mailer.sendMail.mockReturnValue(new Promise(() => {}))

    const pending = sendSmtpMail(smtpConfig, message)
    await vi.advanceTimersByTimeAsync(15_000)
    const result = await pending

    expect(result).toMatchObject({ code: 'SMTP_TIMEOUT', retryable: true })
    expect(mailer.close).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
