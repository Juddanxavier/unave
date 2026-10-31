import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPlanPrice, planPeriodWord } from '@/utilities/planDisplay'
import { mealsLine, priceLine } from '@/utilities/planShopCopy'

import type { Plan } from '@/payload-types'

import { PlanImagePlaceholder } from './PlanImagePlaceholder'

export const PlanCard: React.FC<{ plan: Plan }> = ({ plan }) => {
  const price = formatPlanPrice(plan.price)
  const line = priceLine(price, planPeriodWord(plan.billingPeriod))
  const meals = mealsLine(plan.mealsPerWeek)

  return (
    <Link
      className="group focus-visible:ring-ring/40 block h-full rounded-lg outline-none focus-visible:ring-4"
      href={`/plans/${plan.slug}`}
    >
      <Card className="group-hover:border-primary/40 flex h-full flex-col overflow-hidden transition-colors">
        <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden">
          {plan.image && typeof plan.image === 'object' ? (
            <Media
              fill
              imgClassName="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              resource={plan.image}
              size="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <PlanImagePlaceholder />
          )}
        </div>

        <CardHeader className="gap-2">
          <CardTitle className="text-xl">{plan.title}</CardTitle>
          {plan.summary ? <CardDescription>{plan.summary}</CardDescription> : null}
        </CardHeader>

        <CardContent className="mt-auto flex flex-col gap-1">
          {line ? <p className="text-base font-semibold">{line}</p> : null}
          {meals ? <p className="text-muted-foreground text-sm">{meals}</p> : null}
        </CardContent>
      </Card>
    </Link>
  )
}