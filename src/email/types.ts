export const TEMPLATE_KEYS = ['accessLink', 'test', 'system'] as const

export type TemplateKey = (typeof TEMPLATE_KEYS)[number]

export type MailStatus = 'sent' | 'failed' | 'skipped'

export type MailTransport = 'zeptomail' | 'smtp' | 'none'

export type MailResult = {
  fallbackUsed: boolean
  messageId?: string
  status: MailStatus
  transport: MailTransport
}

export type TemplateMailInput = {
  recipientName?: string
  subscriptionId?: number
  templateKey: 'accessLink' | 'test'
  to: string
  token?: string
  triggeredBy?: number
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
