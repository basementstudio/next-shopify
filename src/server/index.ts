import { NextApiHandler } from 'next'
import { badRequest } from 'src/lib/api-responses'
import { cartHandler, newCartHandler } from './handlers'

export const handleShopify: NextApiHandler<string[]> = (req, res) => {
  const { shopify } = req.query

  if (Array.isArray(shopify)) {
    if (shopify[0] === 'checkout') {
      if (shopify[1]) {
        // is cart operation
        return cartHandler(req, res, shopify[1])
      } else {
        // is request for new cart
        return newCartHandler(req, res)
      }
    }
  }
  badRequest(res, 'Invalid call')
}
