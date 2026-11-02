'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

import { formatPaise } from '@/utilities/money'

/** The admin list column for a money value, in rupees rather than paise. */
export const RupeeCell: React.FC<DefaultCellComponentProps> = ({ cellData }) => {
  const paise = typeof cellData === 'number' ? cellData : Number(cellData ?? 0)

  return <span>{formatPaise(Number.isFinite(paise) ? paise : 0)}</span>
}
