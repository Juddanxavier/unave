export const TEMPLATE_KEYS = ['system', 'cancellation', 'customerAuth'] as const

export type TemplateKey = (typeof TEMPLATE_KEYS)[number]

export type MailStatus = 'sent' | 'failed' | 'skipped'

export type MailTransport = 'zeptomail' | 'smtp' | 'none'

export type MailResult = {
  fallbackUsed: boolean
  messageId?: string
  status: MailStatus
  transport: MailTransport
}

/**
 * The only template mail left. It carries the plan title and cancellation date and
 * no token, so one cancellation can never leak a link to another plan.
 */
export type CancellationMailInput = {
  cancelledAt: string | null
  planTitle: string
  recipientName?: string
  subscriptionId?: number
  templateKey: 'cancellation'
  to: string
  triggeredBy?: number
}

export type TemplateMailInput = CancellationMailInput

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
 * password message. It carries no subscription, so it can never be filed
 * against a plan, and it is never admin editable, because the link inside it
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
