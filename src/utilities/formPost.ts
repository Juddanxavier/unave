import type { PayloadRequest } from 'payload'

import { getServerSideURL } from '@/utilities/getURL'

/**
 * The plumbing every plain HTML `method="post"` form on the site shares.
 *
 * The public forms post to Payload collection endpoints rather than Next server
 * actions so they work without JavaScript: a urlencoded body arrives, the endpoint
 * validates it and answers with a 303 back to the page, which renders one plain
 * error code or one confirmation. The password endpoints were the first users;
 * the enquiry form on `/contact` is the second.
 */

export const withParams = (path: string, params: Record<string, string>): string =>
  `${path}?${new URLSearchParams(params).toString()}`

export const seeOther = (location: string, cookies: string[] = []): Response => {
  const headers = new Headers()
  headers.set('Location', location)

  for (const cookie of cookies) headers.append('Set-Cookie', cookie)

  return new Response(null, { headers, status: 303 })
}

/** Send the browser back to a form with one plain error code on it. */
export const backWithError = (path: string, code: string, extra: Record<string, string> = {}): Response =>
  seeOther(withParams(path, { error: code, ...extra }))

/**
 * Read an `application/x-www-form-urlencoded` body.
 *
 * Payload's helper handles JSON and multipart but not urlencoded, which is what a
 * plain HTML form sends. A body that cannot be read becomes an empty field set, so
 * every route below answers with its normal validation failure rather than a 500.
 */
export const readFormFields = async (req: PayloadRequest): Promise<Record<string, string>> => {
  let body = ''

  try {
    body = (await req.text?.()) ?? ''
  } catch {
    return {}
  }

  return Object.fromEntries(new URLSearchParams(body))
}

/**
 * Cookie free CSRF defence for the public forms.
 *
 * The session cookie is `SameSite=Lax`, so it is not attached to a cross site POST,
 * but a posted form is still worth guarding: an attacker who could post a form from
 * another site could act in the visitor's name without the visitor knowing.
 *
 * Browsers set `Sec-Fetch-Site` on everything modern, and always set `Origin` on a
 * cross site POST either way, so a mismatch is refused and so is a browser request
 * that carries neither.
 */
export const isSameOriginPost = (req: PayloadRequest): boolean => {
  if (req.headers.get('sec-fetch-site') === 'same-origin') return true

  const origin = req.headers.get('origin')
  if (!origin) return false

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (host) return host === originHost

  // No Host to compare against. Fall back to the configured public origin.
  try {
    return new URL(getServerSideURL()).host === originHost
  } catch {
    return false
  }
}
