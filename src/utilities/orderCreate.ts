/**
 * Reading the create endpoint's answer (spec 0007, AC-2 and AC-4).
 *
 * The create endpoint no longer writes an order, so there is no order id to
 * read here: it opens the gateway order and answers with what the popup needs.
 * A shape check keeps a successful create from looking like a failed one.
 */

export type CreatedOrder = {
  amount: number
  gatewayOrderId: string
  keyId: string
}

export const readCreatedOrder = (body: unknown): CreatedOrder | null => {
  if (!body || typeof body !== 'object') return null

  const value = body as Record<string, unknown>

  if (
    typeof value.amount !== 'number' ||
    typeof value.gatewayOrderId !== 'string' ||
    typeof value.keyId !== 'string'
  ) {
    return null
  }

  return {
    amount: value.amount,
    gatewayOrderId: value.gatewayOrderId,
    keyId: value.keyId,
  }
}
