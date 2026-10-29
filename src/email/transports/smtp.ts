import nodemailer from 'nodemailer'

import type { SmtpConfig } from '../config'
import type { TransportOutcome } from '../types'

const OVERALL_TIMEOUT_MS = 15_000
const SOCKET_TIMEOUT_MS = 5_000
const CODE_PATTERN = /^[A-Z0-9_-]{2,40}$/

type SmtpMessage = {
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

const fromError = (error: unknown): TransportOutcome => {
  const record = error && typeof error === 'object' ? (error as { code?: unknown }) : undefined
  const code =
    typeof record?.code === 'string' && CODE_PATTERN.test(record.code)
      ? record.code.toUpperCase()
      : 'SMTP_ERROR'

  return {
    code,
    message: `SMTP failed with ${code}.`,
    ok: false,
    retryable: true,
  }
}

/**
 * Sends through the fallback relay. One connection attempt, an overall deadline
 * on top of the socket timeouts, and the transporter is always closed.
 */
export const sendSmtpMail = async (
  config: SmtpConfig,
  message: SmtpMessage,
): Promise<TransportOutcome> => {
  const transporter = nodemailer.createTransport({
    auth: {
      pass: config.password,
      user: config.user,
    },
    connectionTimeout: SOCKET_TIMEOUT_MS,
    greetingTimeout: SOCKET_TIMEOUT_MS,
    host: config.host,
    port: config.port,
    secure: config.secure,
    socketTimeout: SOCKET_TIMEOUT_MS,
  })

  let timer: ReturnType<typeof setTimeout> | undefined

  const deadline = new Promise<TransportOutcome>((resolve) => {
    timer = setTimeout(() => {
      resolve({
        code: 'SMTP_TIMEOUT',
        message: 'SMTP timed out after 15 seconds.',
        ok: false,
        retryable: true,
      })
    }, OVERALL_TIMEOUT_MS)
  })

  const delivery = transporter
    .sendMail({
      bcc: message.bcc,
      cc: message.cc,
      from: {
        address: message.fromAddress,
        ...(message.fromName ? { name: message.fromName } : {}),
      },
      html: message.html,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      to: {
        address: message.recipient,
        ...(message.recipientName ? { name: message.recipientName } : {}),
      },
    })
    .then(
      (info): TransportOutcome => ({ messageId: info.messageId, ok: true }),
      (error): TransportOutcome => fromError(error),
    )

  try {
    return await Promise.race([delivery, deadline])
  } finally {
    if (timer) clearTimeout(timer)
    transporter.close()
  }
}
