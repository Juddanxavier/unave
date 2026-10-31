import React from 'react'

import { Button } from '@/components/ui/button'
import { CART_REMOVE } from '@/utilities/planShopCopy'

import { removeFromCart } from '../plans/actions'

export const RemoveFromCart: React.FC = () => (
  <form action={removeFromCart}>
    <Button type="submit" variant="outline">
      {CART_REMOVE}
    </Button>
  </form>
)