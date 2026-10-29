import type { TransportOutcome } from '../types'

import type { ZeptoMailConfig } from '../config'

const TIMEOUT_MS = 10_000
const CODE_PATTERN = /^[A-Z0-9_-]{2,40}$/

type ZeptoMailMessage = {
  bcc?: string[]
  cc?: string[]
  fromAddress: string
  fromName?: string
  html: string
  recipient: string
  recipientName?: string
  replyTo: string
  subject: string
  text: string
}

type ProviderBody = {
  code?: unknown
  data?:
    | Array<{ code?: unknown; error_code?: unknown; message_id?: unknown }>
    | { error_code?: unknown; message?: unknown }
  error?: { code?: unknown }
  message_id?: unknown
  request_id?: unknown
}

const asRecord = (value: unknown): ProviderBody | undefined =>
  value && typeof value === 'object' ? (value as ProviderBody) : undefined

const providerCode = (body: ProviderBody | undefined, status: number): string => {
  const data = body?.data
  const fromData = Array.isArray(data) ? (data[0]?.code ?? data[0]?.error_code) : data?.error_code
  const candidates = [body?.error?.code, fromData, body?.code]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && CODE_PATTERN.test(candidate)) {
      return candidate.toUpperCase()
    }
  }

  return `ZEPTOMAIL_${status}`
}

const messageId = (body: ProviderBody | undefined): string | undefined => {
  const data = body?.data
  const fromData = Array.isArray(data) ? data[0]?.message_id : undefined
  const candidates = [body?.request_id, body?.message_id, fromData]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate
  }

  return undefined
}

const namesInvalidRecipient = (value: string): boolean => {
  const text = value.toLowerCase()
  const invalid = '(invalid|not valid|does not exist|undeliverable)'
  const target = '(recipient|email|address)'

  return (
    new RegExp(`${invalid}[\\s\\S]{0,80}${target}`, 'i').test(text) ||
    new RegExp(`${target}[\\s\\S]{0,80}${invalid}`, 'i').test(text)
  )
}

const addressEntry = (address: string, name?: string): Record<string, string> => ({
  address,
  ...(name ? { name } : {}),
})

/**
 * Sends through ZeptoMail's transactional API. Returns a typed outcome instead
 * of throwing, so the caller can decide whether the SMTP fallback should run.
 */
export const sendZeptoMail = async (
  config: ZeptoMailConfig,
  message: ZeptoMailMessage,
): Promise<TransportOutcome> => {
  const body = {
    from: addressEntry(
      message.fromAddress,
      message.fromName,
    ),
    to: [
      {
        email_address: addressEntry(message.recipient, message.recipientName),
      },
    ],
    subject: message.subject,
    htmlbody: message.html,
    textbody: message.text,
    reply_to: [addressEntry(message.replyTo)],
    ...(message.cc?.length
      ? { cc: message.cc.map((address) => ({ email_address: addressEntry(address) })) }
      : {}),
    ...(message.bcc?.length
      ? { bcc: message.bcc.map((address) => ({ email_address: addressEntry(address) })) }
      : {}),
  }

  let response: Response

  try {
    response = await fetch(config.apiUrl, {
      body: JSON.stringify(body),
      headers: {
        Accept: 'application/json',
        Authorization: `Zoho-enczapikey ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    const name = error instanceof Error ? error.name : ''

    if (name === 'TimeoutError' || name === 'AbortError') {
      return {
        code: 'ZEPTOMAIL_TIMEOUT',
        message: 'ZeptoMail timed out after 10 seconds.',
        ok: false,
        retryable: true,
      }
    }

    return {
      code: 'ZEPTOMAIL_NETWORK',
      message: 'ZeptoMail could not be reached.',
      ok: false,
      retryable: true,
    }
  }

  const raw = await response.text().catch(() => '')
  let parsed: unknown

  try {
    parsed = raw ? JSON.parse(raw) : undefined
  } catch {
    parsed = undefined
  }

  const providerBody = asRecord(parsed)

  if (response.ok) {
    return { messageId: messageId(providerBody), ok: true }
  }

  if (namesInvalidRecipient(raw)) {
    return {
      code: providerCode(providerBody, response.status),
      message: 'ZeptoMail reported an invalid recipient.',
      ok: false,
      retryable: false,
    }
  }

  return {
    code: providerCode(providerBody, response.status),
    message: `ZeptoMail rejected the message with HTTP ${response.status}.`,
    ok: false,
    retryable: true,
  }
}
