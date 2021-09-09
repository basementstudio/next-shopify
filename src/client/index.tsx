import { ClientConfig, createClient } from '../lib/shopify'
import * as React from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient
} from 'react-query'
import { useToggleState, ToggleState } from '../utils'

export type LineItem = {
  id: string
  title: string
  quantity: number
  variant: {
    title: string
    available: boolean
    image: { src: string; altText?: string }
    price: string
    sku: string
    selectedOptions: { name: string; value: string }[]
    product: {
      id: string
      handle: string
    }
  }
}

export type Cart = Omit<
  ShopifyBuy.Cart,
  'checkoutUrl' | 'lineItems' | 'lineItemCount' | 'attrs'
> & {
  webUrl: string
  lineItems: LineItem[]
  createdAt: string
  updatedAt: string
  currencyCode: string
  ready: boolean
}

type Context = {
  cartToggleState: ToggleState
  cart: Cart | undefined | null
  cartItemsCount: number | undefined
  onAddLineItem: (vars: {
    variantId: string
    quantity: number
  }) => Promise<Cart | undefined>
  onRemoveLineItem: (vars: { variantId: string }) => Promise<Cart | undefined>
  onUpdateLineItem: (vars: {
    variantId: string
    quantity: number
  }) => Promise<Cart | undefined>
}

const ShopifyContext = React.createContext<Context | undefined>(undefined)

const getQueryKey = (checkoutId: string | null) => ['checkout', checkoutId]

const ContextProvider = ({
  children,
  config,
  canCreateCheckout
}: {
  children?: React.ReactNode
  config: ClientConfig
  canCreateCheckout?: () => boolean | Promise<boolean>
}) => {
  const cartToggleState = useToggleState()
  const [localStorageCheckoutId, setLocalStorageCheckoutId] = React.useState<
    string | null
  >(null)
  const queryClient = useQueryClient()

  const { client } = React.useMemo(() => {
    return createClient(config)
  }, [config])

  React.useEffect(() => {
    const checkoutId = localStorage.getItem('checkout-id')
    if (checkoutId) setLocalStorageCheckoutId(checkoutId)
  }, [])

  const { data: cart } = useQuery<Cart | undefined | null>(
    getQueryKey(localStorageCheckoutId),
    {
      enabled: !!localStorageCheckoutId,
      queryFn: async () => {
        if (!localStorageCheckoutId) return undefined
        const checkout = await client.checkout.fetch(localStorageCheckoutId)
        if (!checkout) {
          // checkout has expired or doesn't exist
          setLocalStorageCheckoutId(null)
          localStorage.removeItem('checkout-id')
          return null
        }
        return (checkout as unknown) as Cart
      },
      refetchOnWindowFocus: false
    }
  )

  const createCheckout = React.useCallback(async () => {
    // TODO here we should implement a queue system to prevent throttling the Storefront API
    // Remember: 1k created checkouts per minute is the limit (4k for Shopify Plus)
    if (canCreateCheckout && !(await canCreateCheckout())) return
    const checkout = await client.checkout.create()
    const checkoutId = checkout.id.toString()
    queryClient.setQueryData(getQueryKey(checkoutId), checkout)
    localStorage.setItem('checkout-id', checkoutId)
    setLocalStorageCheckoutId(checkoutId)
    return checkout
  }, [canCreateCheckout, client.checkout, queryClient])

  const requestCheckoutId = React.useCallback(async () => {
    let checkoutId = localStorageCheckoutId
    if (!checkoutId) {
      checkoutId = (await createCheckout())?.id.toString() ?? null
    }
    return checkoutId
  }, [createCheckout, localStorageCheckoutId])

  const { mutateAsync: onAddLineItem } = useMutation({
    mutationFn: async ({
      variantId,
      quantity
    }: {
      variantId: string
      quantity: number
    }) => {
      const checkoutId = await requestCheckoutId()
      if (!checkoutId) throw new Error('checkout id not found')

      const checkout = await client.checkout.addLineItems(checkoutId, [
        { variantId, quantity }
      ])
      return (checkout as unknown) as Cart
    },
    onSuccess: newCheckout => {
      queryClient.setQueryData(
        getQueryKey(newCheckout.id.toString()),
        newCheckout
      )
    }
  })

  const { mutateAsync: onUpdateLineItem } = useMutation({
    mutationFn: async ({
      variantId,
      quantity
    }: {
      variantId: string
      quantity: number
    }) => {
      const checkoutId = await requestCheckoutId()
      if (!checkoutId) throw new Error('checkout id not found')

      const checkout = await client.checkout.updateLineItems(checkoutId, [
        { quantity, id: variantId }
      ])
      return (checkout as unknown) as Cart
    },
    onSuccess: newCheckout => {
      queryClient.setQueryData(
        getQueryKey(newCheckout.id.toString()),
        newCheckout
      )
    }
  })

  const { mutateAsync: onRemoveLineItem } = useMutation({
    mutationFn: async ({ variantId }: { variantId: string }) => {
      const checkoutId = await requestCheckoutId()
      if (!checkoutId) throw new Error('checkout id not found')

      const checkout = await client.checkout.removeLineItems(checkoutId, [
        variantId
      ])
      return (checkout as unknown) as Cart
    },
    onSuccess: newCheckout => {
      queryClient.setQueryData(
        getQueryKey(newCheckout.id.toString()),
        newCheckout
      )
    }
  })

  const cartItemsCount = React.useMemo(() => {
    let result = 0
    cart?.lineItems?.forEach(i => {
      result += i.quantity
    })
    return result
  }, [cart?.lineItems])

  return (
    <ShopifyContext.Provider
      value={{
        cart,
        cartToggleState,
        cartItemsCount,
        onAddLineItem,
        onRemoveLineItem,
        onUpdateLineItem
      }}
    >
      {children}
    </ShopifyContext.Provider>
  )
}

const queryClient = new QueryClient()

export const ShopifyContextProvider: React.FC<{ config: ClientConfig }> = ({
  children,
  config
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ContextProvider config={config}>{children}</ContextProvider>
    </QueryClientProvider>
  )
}

export const useShopify = () => {
  const ctx = React.useContext(ShopifyContext)
  if (ctx === undefined) {
    throw new Error('useShopify must be used below <ShopifyContextProvider />')
  }
  return ctx
}
