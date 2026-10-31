import React from 'react'

import { Button } from '@/components/ui/button'
import { PLAN_ADD } from '@/utilities/planShopCopy'

import { addToCart } from '../actions'

export const AddToCart: React.FC<{ planId: number; slug: string }> = ({ planId, slug }) => (
  <form action={addToCart}>
    <input name="planId" type="hidden" value={planId} />
    <input name="slug" type="hidden" value={slug} />
    <Button className="w-full sm:w-auto" size="lg" type="submit">
      {PLAN_ADD}
    </Button>
  </form>
)