import type { Payload } from 'payload'

import type { EmailLog } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'

import {
  loadMailSettings,
  readMailEnvironment,
  type MailEnvironment,
  type MailSettings,
} from './config'
import {
  isValidRecipient,
  maskRecipient,
  normalizeRecipientText,
  stripHeaderBreaks,
  toRecipientText,
} from './recipient'
import { renderAccessLink } from './templates/render'
import { sendSmtpMail } from './transports/smtp'
import { sendZeptoMail } from './transports/zeptomail'
import type {
  MailResult,
  MailStatus,
  MailTransport,
  SystemMailInput,
  TemplateKey,
  TemplateMailInput,
} from './types'

type EmailLogData = Omit<EmailLog, 'createdAt' | 'id' | 'updatedAt'>

type DeliveryInput = {
  bcc?: string[]
  cc?: string[]
  fromName?: string
  html: string
  recipientName?: string
  replyTo?: string
  subject: string
  subscriptionId?: number
  templateKey: TemplateKey
  text: string
  to: string
  triggeredBy?: number
}

type LogOutcome = {
  code?: string
  fallbackUsed?: boolean
  message?: string
  messageId?: string
  sentAt?: string
  status: MailStatus
  transport: MailTransport
}

const writeLog = async (
  payload: Payload,
  input: DeliveryInput,
  outcome: LogOutcome,
): Promise<void> => {
  const recipient = normalizeRecipientText(input.to)

  const data: EmailLogData = {
    fallbackUsed: outcome.fallbackUsed ?? false,
    recipient,
    recipientMasked: maskRecipient(recipient),
    recipientName: stripHeaderBreaks(input.recipientName) || undefined,
    status: outcome.status,
    subject: stripHeaderBreaks(input.subject),
    templateKey: input.templateKey,
    transport: outcome.transport,
    ...(input.subscriptionId !== undefined ? { subscription: input.subscriptionId } : {}),
    ...(input.triggeredBy !== undefined ? { triggeredBy: input.triggeredBy } : {}),
    ...(outcome.messageId ? { providerMessageId: outcome.messageId } : {}),
    ...(outcome.code ? { errorCode: outcome.code } : {}),
    ...(outcome.message ? { errorMessage: outcome.message } : {}),
    ...(outcome.sentAt ? { sentAt: outcome.sentAt } : {}),
  }

  try {
    await payload.create({
      collection: 'email-log',
      data,
      overrideAccess: true,
    })
  } catch {
    payload.logger.error({ msg: 'Could not write an email log row.' })
  }
}

const logAndReturn = async (
  payload: Payload,
  input: DeliveryInput,
  outcome: LogOutcome,
): Promise<MailResult> => {
  await writeLog(payload, input, outcome)

  return {
    fallbackUsed: outcome.fallbackUsed ?? false,
    ...(outcome.messageId ? { messageId: outcome.messageId } : {}),
    status: outcome.status,
    transport: outcome.transport,
  }
}

const stampLinkSentAt = async (payload: Payload, subscriptionId: number): Promise<void> => {
  try {
    await payload.update({
      collection: 'subscriptions',
      id: subscriptionId,
      data: { linkSentAt: new Date().toISOString() },
      // A clean context, so the token issuance hook cannot rotate the link.
      context: {},
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    payload.logger.error({ msg: 'Could not mark the access link as sent on the subscription.' })
  }
}

/**
 * One logical send: validate, pick a transport, fall back once, log once.
 * A failed or skipped send returns a result instead of throwing.
 */
const deliver = async (
  payload: Payload,
  environment: MailEnvironment,
  message: DeliveryInput,
): Promise<MailResult> => {
  const recipient = normalizeRecipientText(message.to)

  if (!isValidRecipient(recipient)) {
    return logAndReturn(payload, message, {
      code: 'INVALID_RECIPIENT',
      message: 'The recipient address is not valid.',
      status: 'failed',
      transport: 'none',
    })
  }

  const common = {
    bcc: message.bcc,
    cc: message.cc,
    fromAddress: environment.fromAddress ?? '',
    fromName: message.fromName ?? environment.fromName,
    html: message.html,
    recipient,
    recipientName: stripHeaderBreaks(message.recipientName) || undefined,
    replyTo: message.replyTo ?? environment.replyTo ?? '',
    subject: stripHeaderBreaks(message.subject),
    text: message.text,
  }

  if (!environment.zeptoMail && !environment.smtp) {
    return logAndReturn(payload, message, {
      fallbackUsed: false,
      status: 'skipped',
      transport: 'none',
    })
  }

  if (environment.zeptoMail) {
    const primary = await sendZeptoMail(environment.zeptoMail, common)

    if (primary.ok) {
      return logAndReturn(payload, message, {
        fallbackUsed: false,
        messageId: primary.messageId,
        sentAt: new Date().toISOString(),
        status: 'sent',
        transport: 'zeptomail',
      })
    }

    if (!primary.retryable) {
      return logAndReturn(payload, message, {
        code: primary.code,
        fallbackUsed: false,
        message: primary.message,
        status: 'failed',
        transport: 'none',
      })
    }

    if (!environment.smtp) {
      return logAndReturn(payload, message, {
        code: primary.code,
        fallbackUsed: false,
        message: primary.message,
        status: 'failed',
        transport: 'zeptomail',
      })
    }

    const fallback = await sendSmtpMail(environment.smtp, common)

    if (fallback.ok) {
      return logAndReturn(payload, message, {
        fallbackUsed: true,
        messageId: fallback.messageId,
        sentAt: new Date().toISOString(),
        status: 'sent',
        transport: 'smtp',
      })
    }

    return logAndReturn(payload, message, {
      code: fallback.code,
      fallbackUsed: true,
      message: `ZeptoMail failed with ${primary.code}. SMTP failed with ${fallback.code}.`,
      status: 'failed',
      transport: 'smtp',
    })
  }

  const fallbackOnly = await sendSmtpMail(
    environment.smtp as NonNullable<MailEnvironment['smtp']>,
    common,
  )

  if (fallbackOnly.ok) {
    return logAndReturn(payload, message, {
      fallbackUsed: false,
      messageId: fallbackOnly.messageId,
      sentAt: new Date().toISOString(),
      status: 'sent',
      transport: 'smtp',
    })
  }

  return logAndReturn(payload, message, {
    code: fallbackOnly.code,
    fallbackUsed: false,
    message: fallbackOnly.message,
    status: 'failed',
    transport: 'smtp',
  })
}

export const sendTemplateMail = async (
  payload: Payload,
  input: TemplateMailInput,
): Promise<MailResult> => {
  const environment = readMailEnvironment()
  const settings: MailSettings = await loadMailSettings(payload)
  const copy = settings.copy
  const recipientName = stripHeaderBreaks(input.recipientName) || undefined
  const subject = stripHeaderBreaks(copy.subject) || 'Your Unave plan link'
  const base: DeliveryInput = {
    fromName: stripHeaderBreaks(settings.senderName ?? environment.fromName) || undefined,
    html: '',
    recipientName,
    subject,
    subscriptionId: input.subscriptionId,
    templateKey: input.templateKey,
    text: '',
    to: input.to,
    triggeredBy: input.triggeredBy,
  }

  if (!input.token) {
    return logAndReturn(payload, base, {
      code: 'MISSING_TOKEN',
      message: 'Access link cannot be sent without a token.',
      status: 'failed',
      transport: 'none',
    })
  }

  const token = input.token.replace(/[\r\n]+/g, '')
  const link = `${getServerSideURL()}/plan/${token}`

  let rendered: { html: string; text: string }

  try {
    rendered = await renderAccessLink({ copy, link, recipientName })
  } catch {
    return logAndReturn(payload, base, {
      code: 'RENDER_FAILED',
      message: 'The access link message could not be rendered.',
      status: 'failed',
      transport: 'none',
    })
  }

  const result = await deliver(payload, environment, {
    ...base,
    html: rendered.html,
    text: rendered.text,
  })

  if (
    result.status === 'sent' &&
    input.templateKey === 'accessLink' &&
    input.subscriptionId !== undefined
  ) {
    await stampLinkSentAt(payload, input.subscriptionId)
  }

  return result
}

export const sendSystemMail = async (
  payload: Payload,
  input: SystemMailInput,
): Promise<MailResult> => {
  const environment = readMailEnvironment()
  const recipient = normalizeRecipientText(toRecipientText(input.to))

  const base: DeliveryInput = {
    bcc: input.bcc,
    cc: input.cc,
    html: input.html ?? '',
    replyTo: input.replyTo,
    subject: stripHeaderBreaks(input.subject) || '(no subject)',
    templateKey: 'system',
    text: input.text ?? '',
    to: recipient,
  }

  if (input.attachments && input.attachments.length > 0) {
    return logAndReturn(payload, base, {
      code: 'ATTACHMENTS_UNSUPPORTED',
      message: 'Attachments are not supported by the mail adapter.',
      status: 'failed',
      transport: 'none',
    })
  }

  return deliver(payload, environment, {
    ...base,
    // System mail always leaves with the environment sender and name.
    fromName: environment.fromName,
    recipientName: undefined,
  })
}
