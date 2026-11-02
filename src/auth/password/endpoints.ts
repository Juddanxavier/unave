import { randomBytes } from 'node:crypto'

import type { Endpoint } from 'payload'

import type { Customer } from '@/payload-types'

import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_MAX_AGE,
  customerSessionCookieOptions,
  serializeCookie,
} from '@/utilities/customerSession'
import {
  backWithError,
  isSameOriginPost,
  readFormFields as readFields,
  safeReturnPath,
  seeOther,
  withParams,
} from '@/utilities/formPost'
import {
  checkAccountMailIpLimit,
  checkLoginEmailLimit,
  checkLoginIpLimit,
  getClientIp,
} from '@/utilities/rateLimit'

import { sendResetEmail, sendVerifyEmail } from './mail'
import {
  emailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from './schema'

/**
 * Put Payload's JWT in the customer cookie.
 *
 * The token is already signed by Payload. This only chooses the name, so a
 * storefront sign-in leaves a staff member's `payload-token` untouched.
 */
const sessionCookie = (token: string): string =>
  serializeCookie(CUSTOMER_SESSION_COOKIE, token, {
    ...customerSessionCookieOptions,
    maxAge: CUSTOMER_SESSION_MAX_AGE,
  })

/**
 * The password half of customer accounts.
 *
 * These are Payload collection endpoints rather than Next server actions so the
 * forms on the public pages can be plain HTML `method="post"` forms. They work
 * without JavaScript, they survive a slow connection, and they match how the Google
 * half already reports failures: a 303 back to the page with `?error=` on it, which
 * the page renders as one plain sentence.
 *
 * The credential work is Payload's. `payload.login` verifies the password, counts
 * failed attempts and locks the account; `payload.forgotPassword` and
 * `payload.resetPassword` issue and spend the one time tokens; `payload.create`
 * hashes a new password. This file is the HTML-form adapter around those operations
 * and the place that puts the resulting Payload JWT in the `unave-customer` cookie
 * instead of the staff `payload-token`.
 */

const SIGN_IN_PATH = '/sign-in'
const SIGN_UP_PATH = '/sign-up'
const FORGOT_PATH = '/forgot-password'
const RESET_PATH = '/reset-password'
const ACCOUNT_PATH = '/account'

/** The name Payload puts on its errors, used to choose the plain sentence to show. */
const errorName = (error: unknown): string =>
  error && typeof error === 'object' && typeof (error as { name?: unknown }).name === 'string'
    ? (error as { name: string }).name
    : ''

/**
 * Sign in with an email address and a password.
 *
 * Payload checks the lock, the password and `_verified`, and increments the failed
 * attempt counter. This route only maps each outcome to the one word the form knows.
 */
export const customerLoginEndpoint: Endpoint = {
  handler: async (req) => {
    const fields = await readFields(req)
    const returnTo = safeReturnPath(fields.return)

    /** The visitor came from somewhere worth going back to. Keep the value on
        every exit, so a failed attempt still lands them where they started. */
    const keep: Record<string, string> = returnTo ? { return: returnTo } : {}

    if (!isSameOriginPost(req)) {
      req.payload.logger.warn({ msg: 'customer_login_cross_site_rejected' })
      return backWithError(SIGN_IN_PATH, 'session', keep)
    }

    const parsed = signInSchema.safeParse({ email: fields.email, password: fields.password })

    if (!parsed.success) {
      return backWithError(SIGN_IN_PATH, 'credentials', keep)
    }

    const address = parsed.data.email
    const secret = parsed.data.password

    if (checkLoginIpLimit(getClientIp(req.headers)).limited) {
      return backWithError(SIGN_IN_PATH, 'slow', keep)
    }

    if (checkLoginEmailLimit(address).limited) {
      return backWithError(SIGN_IN_PATH, 'slow', keep)
    }

    try {
      const result = await req.payload.login({
        collection: 'customers',
        data: { email: address, password: secret },
        req,
      })

      const signedIn = result.user

      if (!result.token || !signedIn) {
        req.payload.logger.error({ msg: 'customer_login_no_token' })
        return backWithError(SIGN_IN_PATH, 'session', keep)
      }

      // Backfill the flag for accounts created before it existed: a completed
      // password sign-in is the proof that this customer has a usable password.
      // A failure here must not block the sign-in itself.
      try {
        await req.payload.db.updateOne({
          collection: 'customers',
          data: { hasPassword: true },
          id: signedIn.id,
          req,
          returning: false,
        })
      } catch {
        req.payload.logger.warn({ msg: 'customer_login_password_flag_failed' })
      }

      return seeOther(returnTo ?? ACCOUNT_PATH, [sessionCookie(result.token)])
    } catch (error) {
      const name = errorName(error)

      if (name === 'UnverifiedEmail') {
        // The password was right, so naming the real problem gives nothing away.
        return backWithError(SIGN_IN_PATH, 'unverified', keep)
      }

      if (name === 'LockedAuth') {
        return backWithError(SIGN_IN_PATH, 'locked', keep)
      }

      req.payload.logger.warn({
        err: error instanceof Error ? error.message : String(error),
        msg: 'customer_login_rejected',
      })
      return backWithError(SIGN_IN_PATH, 'credentials', keep)
    }
  },
  method: 'post',
  path: '/login',
}

/**
 * Create an account from the sign-up form.
 *
 * This route never writes to an account that already exists. It cannot: it is
 * reachable without a session, so letting it set a password on an existing record
 * would be a way to take over any account whose address you can guess. A duplicate
 * address is sent to sign in instead, where the owner can use the reset link.
 *
 * Payload performs the hash. The verification email is sent here rather than by
 * `payload.create` only so it uses the branded `customerAuth` template and its text
 * alternative; the token and the `_verified` gate are Payload's.
 */
export const customerRegisterEndpoint: Endpoint = {
  handler: async (req) => {
    if (!isSameOriginPost(req)) {
      req.payload.logger.warn({ msg: 'customer_register_cross_site_rejected' })
      return backWithError(SIGN_UP_PATH, 'session')
    }

    const { email, foodPreference, password } = await readFields(req)
    const parsed = signUpSchema.safeParse({ email, foodPreference, password })

    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0]
      return backWithError(SIGN_UP_PATH, field === 'email' ? 'email' : 'password')
    }

    const address = parsed.data.email
    const secret = parsed.data.password

    if (checkAccountMailIpLimit(getClientIp(req.headers)).limited) {
      return backWithError(SIGN_UP_PATH, 'slow')
    }

    let created: { id: number | string }

    try {
      created = await req.payload.create({
        collection: 'customers',
        data: {
          email: address,
          foodPreference: parsed.data.foodPreference ?? 'none',
          hasPassword: true,
          password: secret,
        },
        depth: 0,
        // The branded email below carries the token instead.
        disableVerificationEmail: true,
        overrideAccess: true,
      })
    } catch (error) {
      // Payload's local strategy raises a ValidationError when the address is taken.
      if (errorName(error) === 'ValidationError') {
        return backWithError(SIGN_IN_PATH, 'exists')
      }

      req.payload.logger.warn({ msg: 'customer_register_write_failed' })
      return backWithError(SIGN_UP_PATH, 'session')
    }

    // `payload.create` strips hidden fields from the returned document, so read the
    // token Payload generated straight from the row.
    const raw = await req.payload.db.findOne<Customer>({
      collection: 'customers',
      req,
      where: { id: { equals: created.id } },
    })
    const token = raw && typeof raw._verificationToken === 'string' ? raw._verificationToken : null

    if (!token) {
      req.payload.logger.error({ msg: 'customer_register_no_verify_token' })
      return backWithError(SIGN_IN_PATH, 'mail')
    }

    const sent = await sendVerifyEmail({
      payload: req.payload,
      to: address,
      token,
    })

    if (sent.status !== 'sent') {
      // The account exists but the address is unproven, so it cannot sign in yet.
      // Sign in offers to send the link again, and the reset link is a second
      // way back in, so this is recoverable rather than a dead end.
      req.payload.logger.error({ msg: 'customer_register_mail_failed' })
      return backWithError(SIGN_IN_PATH, 'mail')
    }

    return seeOther(withParams(SIGN_IN_PATH, { registered: '1' }))
  },
  method: 'post',
  path: '/register',
}

/**
 * Send a fresh confirm-your-address link.
 *
 * Every exit answers the same way, including a refused one, so this cannot be used
 * to ask whether an address has an account.
 */
export const customerResendVerificationEndpoint: Endpoint = {
  handler: async (req) => {
    if (!isSameOriginPost(req)) {
      return backWithError(SIGN_IN_PATH, 'session')
    }

    const parsed = emailSchema.safeParse((await readFields(req)).email)
    const answer = seeOther(withParams(SIGN_IN_PATH, { resent: '1' }))

    if (!parsed.success) return answer
    if (checkAccountMailIpLimit(getClientIp(req.headers)).limited) return answer

    const address = parsed.data

    const found = await req.payload.find({
      collection: 'customers',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      select: { _verified: true, email: true, name: true },
      where: { email: { equals: address } },
    })

    const account = found.docs[0]
    if (!account || account._verified) return answer

    const token = randomBytes(20).toString('hex')

    try {
      await req.payload.db.updateOne({
        collection: 'customers',
        data: { _verificationToken: token },
        id: account.id,
        req,
      })
    } catch {
      req.payload.logger.error({ msg: 'customer_resend_write_failed' })
      return answer
    }

    const sent = await sendVerifyEmail({
      payload: req.payload,
      recipientName: typeof account.name === 'string' ? account.name : undefined,
      to: address,
      token,
    })

    if (sent.status !== 'sent') req.payload.logger.error({ msg: 'customer_resend_mail_failed' })

    return answer
  },
  method: 'post',
  path: '/resend-verification',
}

/**
 * Start a password reset.
 *
 * Always answers `sent=1`, whether or not the address is known and whether or not
 * the mail went out, so the page cannot be used to enumerate accounts. The only
 * way to tell is to look in the inbox.
 *
 * Payload generates and stores the token; `disableEmail` keeps its generic email
 * out of the way so the branded `customerAuth` template can carry the link.
 */
export const customerForgotPasswordEndpoint: Endpoint = {
  handler: async (req) => {
    if (!isSameOriginPost(req)) {
      return backWithError(FORGOT_PATH, 'session')
    }

    const parsed = forgotPasswordSchema.safeParse({
      email: (await readFields(req)).email,
    })
    const answer = seeOther(withParams(FORGOT_PATH, { sent: '1' }))

    if (!parsed.success) return answer
    if (checkAccountMailIpLimit(getClientIp(req.headers)).limited) return answer

    const address = parsed.data.email

    try {
      const token = await req.payload.forgotPassword({
        collection: 'customers',
        data: { email: address },
        disableEmail: true,
        req,
      })

      if (typeof token === 'string' && token.length > 0) {
        const result = await sendResetEmail({
          payload: req.payload,
          to: address,
          token,
        })

        if (result.status !== 'sent') {
          req.payload.logger.error({ msg: 'customer_reset_mail_failed', status: result.status })
        }
      }
    } catch {
      req.payload.logger.error({ msg: 'customer_reset_request_failed' })
    }

    return answer
  },
  method: 'post',
  path: '/forgot-password',
}

/**
 * Finish a password reset.
 *
 * A success signs the person straight in, because they have just proved they own
 * the address and chosen the password. Payload spends the token and returns a JWT.
 * The address is marked verified here for the same reason: the link only reached
 * the inbox that owns it.
 */
export const customerResetPasswordEndpoint: Endpoint = {
  handler: async (req) => {
    const fields = await readFields(req)
    const rawToken = typeof fields.token === 'string' ? fields.token : ''
    const keep: Record<string, string> = rawToken ? { token: rawToken } : {}

    if (!isSameOriginPost(req)) {
      return backWithError(RESET_PATH, 'session', keep)
    }

    const parsed = resetPasswordSchema.safeParse({ password: fields.password, token: rawToken })

    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0]
      return backWithError(RESET_PATH, field === 'password' ? 'password' : 'token', keep)
    }

    try {
      const result = await req.payload.resetPassword({
        collection: 'customers',
        data: { password: parsed.data.password, token: parsed.data.token },
        overrideAccess: true,
        req,
      })

      if (!result.token) {
        req.payload.logger.error({ msg: 'customer_reset_no_token' })
        return backWithError(RESET_PATH, 'session', keep)
      }

      // Payload leaves `_verified` as it was. A reset link proves the same thing a
      // confirmation link does, so honour that before signing the person in.
      const resetUser = result.user as unknown as Customer | null
      if (resetUser) {
        await req.payload.db.updateOne({
          collection: 'customers',
          data: {
            hasPassword: true,
            ...(resetUser._verified ? {} : { _verified: true }),
          },
          id: resetUser.id,
          req,
        })
      }

      return seeOther(ACCOUNT_PATH, [sessionCookie(result.token)])
    } catch (error) {
      if (errorName(error) === 'ValidationError') {
        return backWithError(RESET_PATH, 'password', keep)
      }

      return backWithError(RESET_PATH, 'token', keep)
    }
  },
  method: 'post',
  path: '/reset-password',
}
