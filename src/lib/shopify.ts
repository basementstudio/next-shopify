import Client from 'shopify-buy'

const domain = process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN

if (typeof domain !== 'string' || typeof storefrontAccessToken !== 'string') {
  throw new Error(
    `domain (${domain}) and storefrontAccessToken (${storefrontAccessToken}) must be strings`
  )
}

export const client = Client.buildClient({ domain, storefrontAccessToken })
