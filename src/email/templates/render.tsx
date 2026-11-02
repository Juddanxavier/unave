import { render } from '@react-email/render'
import React from 'react'

import { CustomerAuthEmail, type CustomerAuthAction } from './CustomerAuth'
import {
  default as OrderEmail,
  type OrderEmailProps,
} from './Order'

export type RenderCustomerAuthInput = {
  action: CustomerAuthAction
  link: string
  recipientName?: string
}

export type RenderedMail = {
  html: string
  text: string
}

/**
 * React Email escapes every value it renders into HTML. Header injection is
 * handled before this point by stripping carriage returns and line feeds from
 * the subject and recipient name.
 */
const renderBoth = async (element: React.ReactElement): Promise<RenderedMail> => {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ])

  return { html, text }
}

export const renderCustomerAuth = async ({
  action,
  link,
  recipientName,
}: RenderCustomerAuthInput): Promise<RenderedMail> =>
  renderBoth(<CustomerAuthEmail action={action} link={link} recipientName={recipientName} />)

export const renderOrder = async (props: OrderEmailProps): Promise<RenderedMail> =>
  renderBoth(<OrderEmail {...props} />)