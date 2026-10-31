'use client'
import { Footer } from '@/payload-types'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

export const RowLabel: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<NonNullable<Footer['columns']>[number]>()

  const label = data?.data?.title
    ? `Column ${data.rowNumber !== undefined ? data.rowNumber + 1 : ''}: ${data.data.title}`
    : 'Column'

  return <div>{label}</div>
}
