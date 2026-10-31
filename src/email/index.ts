export { unaveEmailAdapter } from './adapter'
export { readMailEnvironment, loadMailSettings } from './config'
export { maskRecipient, isValidRecipient, normalizeRecipientText } from './recipient'
export { sendCustomerAuthMail, sendSystemMail } from './send'
export { renderCustomerAuth } from './templates/render'
export type { CustomerAuthAction } from './templates/CustomerAuth'
export type {
  CustomerAuthMailInput,
  MailResult,
  MailStatus,
  MailTransport,
  SystemMailInput,
  TemplateKey,
} from './types'
