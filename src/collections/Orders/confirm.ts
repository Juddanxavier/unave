import type { Payload } from 'payload'

import type { Order } from '@/payload-types'

import type { OrderIntent } from './intent'
import { sendOrderMails } from './mail'

/**
 * Writing the paid order, which happens exactly once (spec 0007).
 *
 * A row is born here and nowhere else. The two payment signals — the browser's
 * verified return and the signed webhook — can arrive, and they can arrive
 * together, so this is the single place either one lands. The gateway order id
 * is unique in the collection, which is the whole guard: two racers both try to
 * insert, one wins, and the loser reads the winner's row and sends no mail.
 *
 * An order row therefore means one completed payment. There is no pending state
 * to upkeep and abandoned checkouts leave nothing behind.
 */
export type RecordOrderResult = {
  order: Order | null
  recorded: boolean
}

const findByGatewayOrder = async (
  payload: Payload,
  gatewayOrderId: string,
): Promise<Order | null> => {
  const found = await payload.find({
    collection: 'orders',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { gatewayOrderId: { equals: gatewayOrderId } },
  })

  return (found.docs[0] as Order | undefined) ?? null
}

export const recordPaidOrder = async (
  payload: Payload,
  input: {
    gatewayOrderId: string
    intent: OrderIntent
    paymentId: string
    signature: null | string
  },
): Promise<RecordOrderResult> => {
  const already = await findByGatewayOrder(payload, input.gatewayOrderId)

  if (already) return { order: already, recorded: false }

  let order: Order

  try {
    order = (await payload.create({
      collection: 'orders',
      data: {
        customer: Number(input.intent.customerId),
        delivery: input.intent.delivery,
        gatewayOrderId: input.gatewayOrderId,
        gatewayPaymentId: input.paymentId,
        ...(input.signature ? { gatewaySignature: input.signature } : {}),
        items: input.intent.items,
        paidAt: new Date().toISOString(),
        subtotal: input.intent.total,
        total: input.intent.total,
      },
      depth: 0,
      overrideAccess: true,
    })) as Order
  } catch (error) {
    // The unique gateway order id refused the second insert. The other signal
    // won the race; its row is the truth and it already sent the mails.
    const raced = await findByGatewayOrder(payload, input.gatewayOrderId)

    if (raced) return { order: raced, recorded: false }

    throw error
  }

  try {
    await sendOrderMails(payload, order)
  } catch (error) {
    // sendOrderMails already swallows its own failures; this catch is the belt
    // to that braces. A mail problem must never undo a paid order.
    payload.logger.error({
      err: error instanceof Error ? error.message : String(error),
      msg: 'order_mail_send_failed',
      order: order.id,
    })
  }

  return { order, recorded: true }
}
