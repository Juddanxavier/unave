export { unaveEmailAdapter } from './adapter'
export { readMailEnvironment, loadMailSettings } from './config'
export { maskRecipient, isValidRecipient, normalizeRecipientText } from './recipient'
export { sendCustomerAuthMail, sendOrderMail, sendSystemMail } from './send'
export { renderCustomerAuth, renderOrder } from './templates/render'
export type { CustomerAuthAction } from './templates/CustomerAuth'
export type { OrderMailVariant } from './templates/Order'
export type {
  CustomerAuthMailInput,
  MailResult,
  MailStatus,
  MailTransport,
  SystemMailInput,
  TemplateKey,
} from './types'
