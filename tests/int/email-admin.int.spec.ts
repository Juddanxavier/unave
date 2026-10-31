import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { emailTestEndpoint } from '../../src/endpoints/emailTest'
import { pruneEmailLogTask } from '../../src/jobs/pruneEmailLog'

const mocks = vi.hoisted(() => ({ sendSystemMail: vi.fn() }))

vi.mock('../../src/email/send', () => ({ sendSystemMail: mocks.sendSystemMail }))

const admin = { id: 11, role: 'admin' }
const staff = { id: 12, role: 'staff' }

const makeRequest = (options: {
  body?: string
  recent?: number
  user?: Record<string, unknown> | null
}) => {
  const bodyText = options.body ?? JSON.stringify({ to: 'guest@example.com' })

  return {
    json: vi.fn(async () => JSON.parse(bodyText)),
    payload: {
      count: vi.fn(async (_args: { where: Record<string, unknown> }) => ({
        totalDocs: options.recent ?? 0,
      })),
    },
    user: options.user === undefined ? admin : options.user,
  }
}

const invoke = async (req: ReturnType<typeof makeRequest>) => {
  const response = await emailTestEndpoint.handler(req as never)
  const json = await response.clone().json()

  return { json, response, status: response.status }
}

const runPrune = async (payload: unknown) => {
  const handler = pruneEmailLogTask.handler as unknown as (
    args: unknown,
  ) => Promise<{ output: { deleted: number } }>

  return handler({ req: { payload } })
}

beforeEach(() => {
  mocks.sendSystemMail.mockReset()
  mocks.sendSystemMail.mockResolvedValue({
    fallbackUsed: false,
    messageId: 'test-1',
    status: 'sent',
    transport: 'zeptomail',
  })
})

describe('admin test endpoint', () => {
  it('refuses a request with no session', async () => {
    const { status } = await invoke(makeRequest({ user: null }))

    expect(status).toBe(401)
    expect(mocks.sendSystemMail).not.toHaveBeenCalled()
  })

  it('refuses a staff member', async () => {
    const { status } = await invoke(makeRequest({ user: staff }))

    expect(status).toBe(403)
    expect(mocks.sendSystemMail).not.toHaveBeenCalled()
  })

  it('refuses an invalid address and never counts or sends', async () => {
    const req = makeRequest({ body: JSON.stringify({ to: 'not-an-address' }), user: admin })

    const { status } = await invoke(req)

    expect(status).toBe(400)
    expect(req.payload.count).not.toHaveBeenCalled()
    expect(mocks.sendSystemMail).not.toHaveBeenCalled()
  })

  it('returns 429 and does not send when five tests already ran this hour', async () => {
    const { status } = await invoke(makeRequest({ recent: 5 }))

    expect(status).toBe(429)
    expect(mocks.sendSystemMail).not.toHaveBeenCalled()
  })

  it('counts only this user, this template key and the last hour', async () => {
    const req = makeRequest({ recent: 0 })

    await invoke(req)

    const [args] = req.payload.count.mock.calls[0]
    const where = JSON.stringify(args.where)

    expect(where).toContain('"triggeredBy":{"equals":11}')
    expect(where).toContain('"templateKey":{"equals":"system"}')
    expect(where).toContain('"createdAt":{"greater_than_equal"')
  })

  it('sends a plain test message through the real send path', async () => {
    const req = makeRequest({ recent: 4 })

    const { json, status } = await invoke(req)

    expect(status).toBe(200)
    expect(json).toEqual({ status: 'sent', transport: 'zeptomail' })

    const [passedPayload, sent] = mocks.sendSystemMail.mock.calls[0]
    expect(passedPayload).toBe(req.payload)
    expect(sent).toMatchObject({
      subject: 'Unave test email',
      to: 'guest@example.com',
      triggeredBy: 11,
    })
    expect(sent.html).toContain('test message')
    expect(sent.text).toContain('test message')
  })

  it('reports the transport result of a failed test send', async () => {
    mocks.sendSystemMail.mockResolvedValue({
      fallbackUsed: true,
      status: 'failed',
      transport: 'smtp',
    })

    const { json } = await invoke(makeRequest({ recent: 0 }))

    expect(json).toEqual({ status: 'failed', transport: 'smtp' })
  })
})

describe('prune email log task', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-29T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deletes rows older than 90 days in batches and returns the count', async () => {
    const find = vi
      .fn()
      .mockResolvedValueOnce({ docs: [{ id: 1 }, { id: 2 }] })
      .mockResolvedValueOnce({ docs: [] })
    const del = vi.fn().mockResolvedValue({ docs: [] })

    const result = await runPrune({ delete: del, find })

    expect(result).toEqual({ output: { deleted: 2 } })

    const [findArgs] = find.mock.calls[0]
    expect(findArgs.collection).toBe('email-log')
    expect(findArgs.overrideAccess).toBe(true)
    expect(findArgs.where.createdAt.less_than).toBe('2026-07-31T12:00:00.000Z')

    expect(del).toHaveBeenCalledWith({
      collection: 'email-log',
      overrideAccess: true,
      where: { id: { in: [1, 2] } },
    })
  })

  it('keeps batching while a full batch comes back', async () => {
    const fullBatch = Array.from({ length: 200 }, (_, index) => ({ id: index + 1 }))
    const find = vi.fn().mockResolvedValueOnce({ docs: fullBatch }).mockResolvedValueOnce({ docs: [] })
    const del = vi.fn().mockResolvedValue({ docs: [] })

    const result = await runPrune({ delete: del, find })

    expect(result).toEqual({ output: { deleted: 200 } })
    expect(find).toHaveBeenCalledTimes(2)
    expect(del).toHaveBeenCalledTimes(1)
  })

  it('does nothing when no row is old enough', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    const del = vi.fn()

    const result = await runPrune({ delete: del, find })

    expect(result).toEqual({ output: { deleted: 0 } })
    expect(del).not.toHaveBeenCalled()
  })
})
