import type { CollectionConfig } from 'payload'

import { isAdmin } from '../../access/isAdmin'
import { hasStaffRole } from '../../access/isStaff'
import { staffOrSelf } from '../../access/staffOrSelf'
import { customerSessionStrategy } from '../../auth/customerSession'
import {
  customerLogoutEndpoint,
  customerSessionEndpoint,
  googleAuthorizeEndpoint,
  googleCallbackEndpoint,
} from '../../auth/google/endpoints'
import {
  customerForgotPasswordEndpoint,
  customerLoginEndpoint,
  customerRegisterEndpoint,
  customerResendVerificationEndpoint,
  customerResetPasswordEndpoint,
} from '../../auth/password/endpoints'
import { CUSTOMER_TOKEN_EXPIRATION } from '../../utilities/customerSession'
import { FOOD_PREFERENCES } from '../../utilities/foodPreference'

/**
 * Customer identity, kept in its own auth collection and never in `users`.
 *
 * Payload owns the credentials. This collection uses the built in local strategy,
 * so Payload hashes passwords, verifies them, counts failed attempts, locks an
 * account, issues reset and verification tokens, and signs the session JWT. The
 * app only owns three things Payload does not ship:
 *
 * 1. An open `/register` endpoint. Payload has no public registration endpoint;
 *    it has `registerFirstUser`. The thin endpoint here calls `payload.create`
 *    with a password, so Payload still performs the hashing.
 * 2. The Google OAuth endpoints. Payload has no provider, so the callback mints
 *    the same JWT `payload.login` would, through Payload's own signer and session.
 * 3. The cookie name. Every Payload auth collection shares `${cookiePrefix}-token`
 *    (see `extractJWT`), so a customer session would evict a staff member's admin
 *    session in the same browser. `customerSessionStrategy` reads the Payload JWT
 *    from `unave-customer`, and Payload's own JWT strategy still verifies it.
 *
 * The separation still means a customer document has no `role`, so `hasStaffRole`
 * returns false and every existing staff gate on Plans, Subscriptions, EmailLog and
 * EmailSettings denies it. No staff collection needed an edit for this feature.
 */
export const Customers: CollectionConfig = {
  slug: 'customers',
  access: {
    admin: ({ req: { user } }) => hasStaffRole(user),
    // No public create. Registration and the Google callback write with overrideAccess.
    create: () => false,
    delete: isAdmin,
    // A customer may read their own record; nobody may write it over REST. Profile
    // edits are a staff action until there is a reason for them to be self service.
    read: staffOrSelf,
    update: isAdmin,
  },
  admin: {
    defaultColumns: ['name', 'email', '_verified'],
    description:
      'People who signed in with Google or signed up with an email address. Created by signing in, never by hand.',
    group: 'Customers',
    useAsTitle: 'email',
  },
  auth: {
    forgotPassword: {
      // A reset link is good for an hour.
      expiration: 60 * 60 * 1000,
    },
    // Eight wrong passwords in a row locks the account, and the lock lifts by itself.
    lockTime: 10 * 60 * 1000,
    maxLoginAttempts: 8,
    // Payload verifies the JWT; this strategy only says which cookie it arrived in.
    strategies: [customerSessionStrategy],
    // Thirty days, matching the `unave-customer` cookie in `customerSession.ts`.
    tokenExpiration: CUSTOMER_TOKEN_EXPIRATION,
    // Email must be confirmed before a password can sign anyone in. Google sign-in
    // writes `_verified: true` because Google has already proved the address.
    verify: true,
  },
  // Mounted under /api/customers. Custom endpoints are matched ahead of Payload's
  // built in auth routes, which is what lets `/logout` clear `unave-customer` rather
  // than the staff `payload-token`, and what lets `/login` set our cookie.
  endpoints: [
    googleAuthorizeEndpoint,
    googleCallbackEndpoint,
    customerLogoutEndpoint,
    customerSessionEndpoint,
    customerLoginEndpoint,
    customerRegisterEndpoint,
    customerForgotPasswordEndpoint,
    customerResetPasswordEndpoint,
    customerResendVerificationEndpoint,
  ],
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'phone',
      type: 'text',
      admin: {
        description: 'Saved by the customer on their account page, and copied onto new plans.',
        position: 'sidebar',
      },
      validate: (value: string | null | undefined) => {
        // Optional on the profile: an account can exist before an address does.
        if (!value) return true
        return /^[0-9+\s-]{7,15}$/.test(value) || 'Enter a valid phone number.'
      },
    },
    {
      name: 'address',
      type: 'group',
      admin: {
        description: 'Saved by the customer on their account page, and copied onto new plans.',
        position: 'sidebar',
      },
      fields: [
        {
          name: 'line1',
          label: 'Address line 1',
          type: 'text',
        },
        {
          name: 'line2',
          label: 'Address line 2',
          type: 'text',
        },
        {
          name: 'city',
          type: 'text',
        },
        {
          name: 'state',
          type: 'text',
        },
        {
          name: 'pincode',
          type: 'text',
          validate: (value: string | null | undefined) => {
            if (!value) return true
            return /^\d{6}$/.test(value) || 'Enter a 6 digit pincode.'
          },
        },
      ],
    },
    {
      name: 'foodPreference',
      label: 'Food preference',
      type: 'select',
      admin: {
        description: 'Optional. What the customer prefers to eat, so the kitchen knows.',
        position: 'sidebar',
      },
      defaultValue: 'none',
      options: FOOD_PREFERENCES,
    },
    {
      name: 'hasPassword',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Whether a password is set, so a Google-only account can be told from one that also signs in with email. Maintained by sign-in; never edited by hand.',
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'picture',
      type: 'text',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'googleId',
      type: 'text',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        description: 'The Google account id. Set by sign-in and never edited by hand.',
        hidden: true,
      },
      index: true,
      unique: true,
    },
  ],
  timestamps: true,
}
