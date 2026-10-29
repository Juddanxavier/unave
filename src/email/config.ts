import type { Payload } from 'payload'

import { defaultAccessLinkCopy, mergeAccessLinkCopy, type AccessLinkCopy } from './copy'

export type ZeptoMailConfig = {
  apiKey: string
  apiUrl: string
}

export type SmtpConfig = {
  host: string
  password: string
  port: number
  secure: boolean
  user: string
}

export type MailEnvironment = {
  fromAddress?: string
  fromName?: string
  replyTo?: string
  smtp?: SmtpConfig
  zeptoMail?: ZeptoMailConfig
}

export type MailSettings = {
  copy: AccessLinkCopy
  senderName?: string
}

const value = (name: string): string | undefined => {
  const raw = process.env[name]
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export const readMailEnvironment = (): MailEnvironment => {
  const fromAddress = value('MAIL_FROM_ADDRESS')
  const replyTo = value('MAIL_REPLY_TO')
  const apiKey = value('ZEPTOMAIL_API_KEY')

  const zeptoMail =
    apiKey && fromAddress && replyTo
      ? {
          apiKey,
          apiUrl: value('ZEPTOMAIL_API_URL') ?? 'https://api.zeptomail.com/v1.1/email',
        }
      : undefined

  const host = value('SMTP_HOST')
  const portText = value('SMTP_PORT')
  const user = value('SMTP_USER')
  const password = value('SMTP_PASSWORD')
  const port = portText ? Number(portText) : NaN

  const smtp =
    host && Number.isFinite(port) && port > 0 && user && password && fromAddress && replyTo
      ? {
          host,
          password,
          port,
          secure: value('SMTP_SECURE') === 'true',
          user,
        }
      : undefined

  return {
    fromAddress,
    fromName: value('MAIL_FROM_NAME'),
    replyTo,
    smtp,
    zeptoMail,
  }
}

export const loadMailSettings = async (payload: Payload): Promise<MailSettings> => {
  try {
    const doc = await payload.findGlobal({ slug: 'email-settings', depth: 0 })
    const settings = doc as
      | { accessLink?: Parameters<typeof mergeAccessLinkCopy>[0]; senderName?: string | null }
      | null
      | undefined
    const senderName = settings?.senderName?.trim()

    return {
      copy: settings?.accessLink ? mergeAccessLinkCopy(settings.accessLink) : defaultAccessLinkCopy,
      senderName: senderName && senderName.length > 0 ? senderName : undefined,
    }
  } catch {
    payload.logger.error({
      msg: 'Could not read the email settings global. Falling back to the code defaults.',
    })

    return { copy: defaultAccessLinkCopy }
  }
}
