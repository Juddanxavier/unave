export { unaveEmailAdapter } from './adapter'
export {
  defaultCancellationCopy,
  mergeCancellationCopy,
  type CancellationCopy,
} from './copy'
export { readMailEnvironment, loadMailSettings } from './config'
export { maskRecipient, isValidRecipient, normalizeRecipientText } from './recipient'
export { sendCustomerAuthMail, sendSystemMail, sendTemplateMail } from './send'
export { renderCancellation, renderCustomerAuth } from './templates/render'
export type { CustomerAuthAction } from './templates/CustomerAuth'
export type {
  CustomerAuthMailInput,
  MailResult,
  MailStatus,
  MailTransport,
  SystemMailInput,
  TemplateKey,
  TemplateMailInput,
} from './types'
