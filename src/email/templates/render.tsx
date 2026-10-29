import { render } from '@react-email/render'
import React from 'react'

import type { AccessLinkCopy } from '../copy'

import { AccessLinkEmail } from './AccessLink'

export type RenderAccessLinkInput = {
  copy: AccessLinkCopy
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
export const renderAccessLink = async ({
  copy,
  link,
  recipientName,
}: RenderAccessLinkInput): Promise<RenderedMail> => {
  const element = <AccessLinkEmail copy={copy} link={link} recipientName={recipientName} />

  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ])

  return { html, text }
}
