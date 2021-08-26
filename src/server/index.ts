import { NextApiHandler } from 'next'
import { badRequest } from '../lib/api-responses'
import { ClientConfig, createClient } from '../lib/shopify'
import { cartHandler, newCartHandler } from './handlers'

export const handleShopify = (config: ClientConfig) => {
  const handler: NextApiHandler<string[]> = (req, res) => {
    const { shopify } = req.query

    if (Array.isArray(shopify)) {
      if (shopify[0] === 'checkout') {
        const client = createClient(config)
        if (shopify[1]) {
          // is cart operation
          return cartHandler(req, res, { client, id: shopify[1] })
        } else {
          // is request for new cart
          return newCartHandler(req, res, { client })
        }
      }
    }
    return badRequest(res, 'Invalid call')
  }
  return handler
}
