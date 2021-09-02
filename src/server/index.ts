import { NextApiHandler } from 'next'
import { badRequest } from '../lib/api-responses'
import { ClientConfig, createClient } from '../lib/shopify'
import { cartHandler, newCartHandler } from './handlers'

export const handleShopifyStorefront = (config: ClientConfig) => {
  const handler: NextApiHandler<string[]> = (req, res) => {
    const { storefront } = req.query

    if (Array.isArray(storefront)) {
      if (storefront[0] === 'checkout') {
        const { client } = createClient(config)
        if (storefront[1]) {
          // is cart operation
          return cartHandler(req, res, { client, id: storefront[1] })
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
