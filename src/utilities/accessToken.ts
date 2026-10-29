import { createHash, randomBytes } from 'node:crypto'

export const ACCESS_TOKEN_TTL_DAYS = 7

export const generateAccessToken = (): string => randomBytes(32).toString('base64url')

export const hashAccessToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

export const accessTokenExpiry = (from: Date = new Date()): string => {
  const expiry = new Date(from.getTime())
  expiry.setUTCDate(expiry.getUTCDate() + ACCESS_TOKEN_TTL_DAYS)
  return expiry.toISOString()
}
