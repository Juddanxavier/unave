import React from 'react'

import { DISPLAY_STATE_LABELS, type PlanDisplayState } from '@/utilities/planDisplay'
import { cn } from '@/utilities/ui'

type Tone = 'neutral' | 'positive' | 'warning' | 'negative'

const STATUS_TONE: Record<PlanDisplayState, Tone> = {
  active: 'positive',
  awaiting_confirmation: 'neutral',
  cancellation_requested: 'warning',
  cancelled: 'negative',
  ended: 'neutral',
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  positive: 'bg-success/15 text-foreground',
  warning: 'bg-warning/20 text-foreground',
  negative: 'bg-destructive/15 text-foreground',
}

const badge = (tone: Tone) =>
  cn(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
    TONE_CLASSES[tone],
  )

/** The customer friendly status label. The stored status value is never shown. */
export const PlanStatusBadge: React.FC<{ state: PlanDisplayState }> = ({ state }) => (
  <span className={badge(STATUS_TONE[state])}>{DISPLAY_STATE_LABELS[state]}</span>
)
