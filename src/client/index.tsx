import { ClientConfig, createClient } from '../lib/shopify'
import React from 'react'
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
  cart: Cart | undefined
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
  config
}: {
  children?: React.ReactNode
  config: ClientConfig
}) => {
  const cartToggleState = useToggleState()
  const [localStorageCheckoutId, setLocalStorageCheckoutId] = React.useState<
    string | null
  >(null)
  const queryClient = useQueryClient()

  const { client } = React.useMemo(() => {
    return createClient(config)
  }, [config])

  const queryKey = React.useMemo(() => getQueryKey(localStorageCheckoutId), [
    localStorageCheckoutId
  ])

  React.useEffect(() => {
    const checkoutId = localStorage.getItem('checkout-id')
    if (checkoutId) setLocalStorageCheckoutId(checkoutId)
    else {
      client.checkout.create().then(checkout => {
        const checkoutId = checkout.id.toString()
        queryClient.setQueryData(['checkout', checkoutId], checkout)
        localStorage.setItem('checkout-id', checkoutId)
        setLocalStorageCheckoutId(checkoutId)
      })
    }
  }, [queryClient])

  const { data: cart } = useQuery<Cart | undefined>(queryKey, {
    enabled: !!localStorageCheckoutId,
    queryFn: async () => {
      if (!localStorageCheckoutId) return undefined
      let checkout
      try {
        checkout = await client.checkout.fetch(localStorageCheckoutId)
        if (!checkout) checkout = await client.checkout.create()
      } catch (error) {
        checkout = await client.checkout.create()
      }
      const checkoutId = checkout.id.toString()
      if (checkoutId !== localStorageCheckoutId) {
        // the checkout was invalid
        localStorage.setItem('checkout-id', checkoutId)
        setLocalStorageCheckoutId(checkoutId)
        queryClient.setQueryData(getQueryKey(checkoutId), checkout)
      }
      return (checkout as unknown) as Cart
    }
  })

  const { mutateAsync: onAddLineItem } = useMutation({
    mutationFn: async ({
      variantId,
      quantity
    }: {
      variantId: string
      quantity: number
    }) => {
      if (!localStorageCheckoutId) return
      const checkout = await client.checkout.addLineItems(
        localStorageCheckoutId,
        [{ variantId, quantity }]
      )
      return (checkout as unknown) as Cart
    },
    onSuccess: newCheckout => {
      queryClient.setQueryData(queryKey, newCheckout)
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries(queryKey)
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
      if (!localStorageCheckoutId) return
      const checkout = await client.checkout.updateLineItems(
        localStorageCheckoutId,
        [{ quantity, id: variantId }]
      )
      return (checkout as unknown) as Cart
    },
    onSuccess: newCheckout => {
      queryClient.setQueryData(queryKey, newCheckout)
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries(queryKey)
    }
  })

  const { mutateAsync: onRemoveLineItem } = useMutation({
    mutationFn: async ({ variantId }: { variantId: string }) => {
      if (!localStorageCheckoutId) return
      const checkout = await client.checkout.removeLineItems(
        localStorageCheckoutId,
        [variantId]
      )
      return (checkout as unknown) as Cart
    },
    onSuccess: newCheckout => {
      queryClient.setQueryData(queryKey, newCheckout)
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries(queryKey)
    }
  })

  const cartItemsCount = React.useMemo(() => {
    let result = 0
    if (cart?.lineItems && cart?.lineItems.length) {
      cart.lineItems.forEach(i => {
        result += i.quantity
      })
    }
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
