import { describe, expect, it } from 'vitest'

import { defaultAccessLinkCopy } from '../../src/email/copy'
import { renderAccessLink } from '../../src/email/templates/render'

const link = 'https://unave.test/plan/raw-token-value'
const copy = { ...defaultAccessLinkCopy, subject: 'Subject from settings' }

describe('access link rendering', () => {
  it('puts every copy field and the link into the HTML body', async () => {
    const { html } = await renderAccessLink({ copy, link })

    expect(html).toContain(copy.heading)
    expect(html).toContain(copy.intro)
    expect(html).toContain(copy.buttonLabel)
    expect(html).toContain(copy.footerNote)
    expect(html).toContain(copy.signature)
    expect(html).toContain(`href="${link}"`)
  })

  it('puts the link and copy into the plain text body', async () => {
    const { text } = await renderAccessLink({ copy, link })

    expect(text).toContain(link)
    expect(text).toContain(copy.buttonLabel)
    expect(text).toContain(copy.signature)
  })

  it('escapes a recipient name instead of rendering markup', async () => {
    const { html } = await renderAccessLink({
      copy,
      link,
      recipientName: '<script>alert("x")</script>',
    })

    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
  })

  it('greets the recipient by name when one is given', async () => {
    const { html, text } = await renderAccessLink({ copy, link, recipientName: 'Priya' })

    expect(html.replace(/<!-- -->/g, '')).toContain('Hi Priya,')
    expect(text).toContain('Hi Priya,')
  })

  it('skips the greeting line when no name is given', async () => {
    const { text } = await renderAccessLink({ copy, link })

    expect(text).not.toContain('Hi ,')
  })

  it('does not put the subject into the body, the caller sends it separately', async () => {
    const { html } = await renderAccessLink({ copy, link })

    expect(html).not.toContain('Subject from settings')
  })
})
