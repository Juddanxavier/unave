import type { CollectionBeforeChangeHook } from 'payload'

import {
  accessTokenExpiry,
  generateAccessToken,
  hashAccessToken,
} from '@/utilities/accessToken'

/**
 * Issues a fresh secret link token on create, or when a caller asks for a new one
 * by setting req.context.issueNewAccessToken. Only the hash is stored. The raw token
 * is left on req.context.rawAccessToken so the caller can email it once.
 */
export const issueAccessToken: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  const shouldIssue = operation === 'create' || req.context?.issueNewAccessToken === true
  if (!shouldIssue) return data

  const token = generateAccessToken()

  if (req.context) {
    req.context.rawAccessToken = token
  }

  return {
    ...data,
    accessTokenHash: hashAccessToken(token),
    accessTokenExpiresAt: accessTokenExpiry(),
  }
}
