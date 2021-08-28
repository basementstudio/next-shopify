# next-shopify

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
// /pages/_app.tsx
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
// /pages/api/shopify/[...storefront].ts
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

---

![we make cool sh*t that performs](https://basement.studio/images/index/twitter-card.png)
