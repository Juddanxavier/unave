import type { TaskConfig } from 'payload'

const RETENTION_DAYS = 90
const BATCH_SIZE = 200
const MAX_BATCHES = 500

type PruneEmailLogInput = Record<string, never>
type PruneEmailLogOutput = { deleted: number }

/**
 * Deletes email log rows older than 90 days in batches. Callable through the
 * jobs endpoint with CRON_SECRET, and scheduled once a day.
 */
export const pruneEmailLogTask: TaskConfig<{
  input: PruneEmailLogInput
  output: PruneEmailLogOutput
}> = {
  slug: 'pruneEmailLog',
  label: 'Prune the email log',
  schedule: [{ cron: '0 3 * * *', queue: 'default' }],
  handler: async ({ req }) => {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    let deleted = 0

    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      const found = await req.payload.find({
        collection: 'email-log',
        depth: 0,
        limit: BATCH_SIZE,
        overrideAccess: true,
        where: {
          createdAt: {
            less_than: cutoff,
          },
        },
      })

      if (found.docs.length === 0) break

      const ids = found.docs.map((doc) => doc.id)

      await req.payload.delete({
        collection: 'email-log',
        overrideAccess: true,
        where: {
          id: {
            in: ids,
          },
        },
      })

      deleted += ids.length

      if (found.docs.length < BATCH_SIZE) break
    }

    return { output: { deleted } }
  },
}
