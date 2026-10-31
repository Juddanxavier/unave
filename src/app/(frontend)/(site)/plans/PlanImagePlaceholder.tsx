import { UtensilsCrossed } from 'lucide-react'
import React from 'react'

/**
 * A neutral stand in for a plan that has no image yet. The plate icon makes the
 * block read as deliberate rather than as a failed image. Decorative only, so
 * it stays out of the accessibility tree.
 */
export const PlanImagePlaceholder: React.FC = () => (
  <div aria-hidden="true" className="bg-muted absolute inset-0 flex items-center justify-center">
    <UtensilsCrossed className="text-muted-foreground/40 h-10 w-10" strokeWidth={1.25} />
  </div>
)