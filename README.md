# next-shopify

**🚨 Library under heavy development. Don't use just yet. 🚨**

[![from the basement.](https://basement.studio/gh-badge.svg)](https://basement.studio)

A context, a hook, and an API route handler, to manage a Shopify Storefront in your Next.js app.

- ✅ Easy to use, Next.js friendly implementation of the [Shopify Storefront API](https://shopify.dev/api/storefront).
- 🗄 Store your cart id in [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
- 🐎 Global app cache with [`react-query`](https://react-query.tanstack.com/).
- 💥 API route handler with [catch-all API routes](https://nextjs.org/docs/api-routes/dynamic-api-routes#catch-all-api-routes).

## Install

```bash
yarn add next-shopify
```

Or with npm:

```bash
npm i next-shopify
```

## Before You Start

In order to use the Storefront API, which is what this library uses, you'll need to set up your Shopify Store with a private app.

1. Go to your private apps: `https://<your-shopify-domain>/admin/apps/private`, and create one.
2. Down at the bottom of your app's dashboard, you'll need to enable the Storefront API and give it the correct permissions.
3. Take hold of the Storefront Access Token — we'll need it later.

## Usage

Just three steps and we'll be ready to roll.

```bash
yarn add next-shopify
```

### 1. Wrap Your Application with the Context Provider

```tsx
// pages/_app.tsx
import { AppProps } from 'next/app'
import { ShopifyContextProvider } from 'next-shopify'

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <ShopifyContextProvider>
      <Component {...pageProps} />
    </ShopifyContextProvider>
  )
}

export default App
```

### 2. Add the API Route

We add an API Route, and we use `next-shopify`'s built in handler.

```ts
// pages/api/shopify/[...storefront].ts
import { handleShopifyStorefront } from 'next-shopify'

// be sure to add the correct env variables.

export default handleShopifyStorefront({
  domain: process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN as string,
  storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN as string
})
```

### 3. Use the Hook

This is just an example.

```tsx
import { useShopify } from 'next-shopify'

export const Cart = () => {
  const {
    cart,
    cartToggleState
    // cartItemsCount,
    // onAddLineItem,
    // onRemoveLineItem,
    // onUpdateLineItem
  } = useShopify()

  if (!cartToggleState.isOn || !cart) return null
  return (
    <div>
      <h2>Cart</h2>
      <button onClick={cartToggleState.handleOff}>Close</button>
      {cart.lineItems.map(lineItem => {
        return (
          <div key={lineItem.id}>
            <p>{lineItem.title}</p>
          </div>
        )
      })}
      <a href={cart.webUrl}>Checkout</a>
    </div>
  )
}

export const Header = () => {
  const { cartToggleState } = useShopify()

  return (
    <>
      <header>
        <a>Logo</a>
        <button onClick={cartToggleState.handleOn}>Open cart</button>
      </header>
      <Cart />
    </>
  )
}
```

## Fetching Products

In the following example, we explain how to use some helper methods to fetch products. Be aware that `shopify-buy` typings are wrong, and thus our methods can receive a custom `formatProduct` function that can help you have a better TypeScript experience.

```ts
// lib/shopify.ts
import { createClient } from 'next-shopify'

const { fetchAllProducts, fetchProductByHandle, client } = createClient({
  domain: process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN as string,
  storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN as string
})

fetchAllProducts().then(products => {
  console.log(products)
})

fetchProductByHandle('<slug>').then(product => {
  console.log(product)
})

// Passing a formatter (for better TypeScript experience) --------

function formatProduct(p: ShopifyBuy.Product) {
  return {
    id: p.id.toString(),
    title: p.title,
    slug: (p as any).handle as string, // shopify buy typings are wrong, sorry for this...
    images: p.images.map(img => ({
      src: img.src,
      alt: (img as any).altText ?? null
    }))
  }
}

fetchAllProducts(formatProduct).then(products => {
  console.log(products)
})

fetchProductByHandle('<slug>', formatProduct).then(product => {
  console.log(product)
})

// We also expose the whole client -------------------------------

console.log(client)
```

## Using Other `shopify-buy` Methods

[`shopify-buy`](https://www.npmjs.com/package/shopify-buy) is the official Storefront API JavaScript SDK. It's robust, but not easy to integrate — precisely why we created `next-shopify`. Therefore, if you still need to use other `shopify-buy` methods, we expose the whole client like this:

```ts
// lib/shopify.ts
import { createClient } from 'next-shopify'

export const { client } = createClient({
  domain: process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN as string,
  storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN as string
})
```

---

![we make cool sh*t that performs](https://basement.studio/images/index/twitter-card.png)
