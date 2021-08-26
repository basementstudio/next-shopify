import Client from 'shopify-buy'

export type ClientConfig = { domain: string; storefrontAccessToken: string }

export const createClient = ({ domain, storefrontAccessToken }: ClientConfig) =>
  Client.buildClient({ domain, storefrontAccessToken })
