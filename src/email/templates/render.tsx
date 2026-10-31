import { render } from '@react-email/render'
import React from 'react'

import { getServerSideURL } from '@/utilities/getURL'
import { formatPlanDate } from '@/utilities/planDates'

import type { CancellationCopy } from '../copy'

import { CancellationEmail } from './Cancellation'
import { CustomerAuthEmail, type CustomerAuthAction } from './CustomerAuth'

export type RenderCancellationInput = {
  cancelledAt?: string | null
  copy: CancellationCopy
  planTitle: string
  recipientName?: string
}

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

/**
 * Renders the cancellation message. It has no button and no link back to the
 * plan, so a bearer token never appears in a second message.
 */
export const renderCancellation = async ({
  cancelledAt,
  copy,
  planTitle,
  recipientName,
}: RenderCancellationInput): Promise<RenderedMail> =>
  renderBoth(
    <CancellationEmail
      cancelledOn={formatPlanDate(cancelledAt)}
      contactLink={`${getServerSideURL()}/contact`}
      copy={copy}
      planTitle={planTitle}
      recipientName={recipientName}
    />,
  )

/**
 * Renders a confirm-your-address or reset-your-password message. The link is
 * built by the caller from the token Payload issued, so this module never
 * decides what a valid token looks like.
 */
export const renderCustomerAuth = async ({
  action,
  link,
  recipientName,
}: RenderCustomerAuthInput): Promise<RenderedMail> =>
  renderBoth(<CustomerAuthEmail action={action} link={link} recipientName={recipientName} />)
