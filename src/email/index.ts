export { unaveEmailAdapter } from './adapter'
export { defaultAccessLinkCopy, mergeAccessLinkCopy, type AccessLinkCopy } from './copy'
export { readMailEnvironment, loadMailSettings } from './config'
export { maskRecipient, isValidRecipient, normalizeRecipientText } from './recipient'
export { sendSystemMail, sendTemplateMail } from './send'
export { renderAccessLink } from './templates/render'
export type {
  MailResult,
  MailStatus,
  MailTransport,
  SystemMailInput,
  TemplateKey,
  TemplateMailInput,
} from './types'
