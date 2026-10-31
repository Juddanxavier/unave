import { describe, expect, it } from 'vitest'

import { renderCustomerAuth } from '../../src/email/templates/render'

const link = 'https://unave.test/verify-email?token=raw-token-value'

describe('account email rendering', () => {
  it('puts the link and the button label into the HTML body', async () => {
    const { html } = await renderCustomerAuth({ action: 'verify', link })

    expect(html).toContain('Confirm your UNAVE account')
    expect(html).toContain('Confirm my email')
    expect(html).toContain(`href="${link}"`)
  })

  it('puts the link into the plain text body', async () => {
    const { text } = await renderCustomerAuth({ action: 'reset', link })

    expect(text).toContain(link)
    expect(text).toContain('Choose a new password')
  })

  it('escapes a recipient name instead of rendering markup', async () => {
    const { html } = await renderCustomerAuth({
      action: 'verify',
      link,
      recipientName: '<script>alert("x")</script>',
    })

    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
  })

  it('greets the recipient by name when one is given', async () => {
    const { html, text } = await renderCustomerAuth({
      action: 'verify',
      link,
      recipientName: 'Priya',
    })

    expect(html.replace(/<!-- -->/g, '')).toContain('Hi Priya,')
    expect(text).toContain('Hi Priya,')
  })

  it('skips the greeting line when no name is given', async () => {
    const { text } = await renderCustomerAuth({ action: 'verify', link })

    expect(text).not.toContain('Hi ,')
  })
})
