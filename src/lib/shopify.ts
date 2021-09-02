import Client from 'shopify-buy'

export type ClientConfig = { domain: string; storefrontAccessToken: string }

export const createClient = ({
  domain,
  storefrontAccessToken
}: ClientConfig) => {
  const client = Client.buildClient({ domain, storefrontAccessToken })

  function fetchAllProducts(): Promise<ShopifyBuy.Product[]>
  function fetchAllProducts<T>(
    formatProduct: (p: ShopifyBuy.Product) => T
  ): Promise<T[]>
  async function fetchAllProducts(formatProduct?: any) {
    const products = await client.product.fetchAll()
    if (formatProduct) return products.map(p => formatProduct(p))
    return products
  }

  function fetchProductByHandle(handle: string): Promise<ShopifyBuy.Product>
  function fetchProductByHandle<T>(
    handle: string,
    formatProduct: (p: ShopifyBuy.Product) => T
  ): Promise<T>
  async function fetchProductByHandle(handle: string, formatProduct?: any) {
    const product = await client.product.fetchByHandle(handle)
    if (formatProduct) return formatProduct(product)
    return product
  }

  return { client, fetchAllProducts, fetchProductByHandle }
}
