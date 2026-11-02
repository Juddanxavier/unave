export const TEMPLATE_KEYS = ['system', 'customerAuth', 'order'] as const

export type TemplateKey = (typeof TEMPLATE_KEYS)[number]

export type MailStatus = 'sent' | 'failed' | 'skipped'

export type MailTransport = 'zeptomail' | 'smtp' | 'none'

export type MailResult = {
  fallbackUsed: boolean
  messageId?: string
  status: MailStatus
  transport: MailTransport
}

export type SystemMailInput = {
  attachments?: unknown[]
  bcc?: string[]
  cc?: string[]
  html?: string
  replyTo?: string
  subject?: string
  text?: string
  to: string
  triggeredBy?: number
}

/**
 * Account security mail: the confirm-your-address message and the reset-your-
 * password message. It is never admin editable, because the link inside it
 * decides who gets into an account.
 */
export type CustomerAuthMailInput = {
  html: string
  recipientName?: string
  subject: string
  text: string
  to: string
}

export type TransportSuccess = {
  messageId?: string
  ok: true
}

export type TransportFailure = {
  code: string
  message: string
  ok: false
  retryable: boolean
}

export type TransportOutcome = TransportSuccess | TransportFailure
