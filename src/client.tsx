import React from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient
} from 'react-query'
import { useToggleState, ToggleState } from './utils'

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
  }) => Promise<void>
  onRemoveLineItem: (vars: { variantId: string }) => Promise<void>
  onUpdateLineItem: (vars: {
    variantId: string
    quantity: number
  }) => Promise<void>
}

const ShopifyContext = React.createContext<Context | undefined>(undefined)

const getQueryKey = (checkoutId: string | null) => ['checkout', checkoutId]

const ContextProvider = ({
  children,
  baseApiPath = '/api/shopify/'
}: {
  children?: React.ReactNode
  baseApiPath?: string
}) => {
  const cartToggleState = useToggleState()
  const [localStorageCheckoutId, setLocalStorageCheckoutId] = React.useState<
    string | null
  >(null)
  const queryClient = useQueryClient()

  const getApiPath = React.useCallback((path: string) => {
    const cleanBaseApiPath = baseApiPath.endsWith('/')
      ? baseApiPath.substring(0, baseApiPath.length - 1)
      : baseApiPath
    return cleanBaseApiPath + path
  }, [])

  const queryKey = React.useMemo(() => getQueryKey(localStorageCheckoutId), [
    localStorageCheckoutId
  ])

  React.useEffect(() => {
    const checkoutId = localStorage.getItem('checkout-id')
    if (checkoutId) setLocalStorageCheckoutId(checkoutId)
    else {
      fetch(getApiPath('/checkout')).then(async res => {
        const { checkout } = await res.json()
        const checkoutId = checkout.id.toString()
        queryClient.setQueryData(['checkout', checkoutId], checkout)
        localStorage.setItem('checkout-id', checkoutId)
        setLocalStorageCheckoutId(checkoutId)
      })
    }
  }, [queryClient, getApiPath])

  const { data: cart } = useQuery<Cart>(queryKey, {
    enabled: !!localStorageCheckoutId,
    queryFn: async () => {
      const res = await fetch(getApiPath(`/checkout/${localStorageCheckoutId}`))
      const { checkout } = await res.json()
      const checkoutId = checkout.id.toString()
      if (checkoutId !== localStorageCheckoutId) {
        // the checkout was invalid
        localStorage.setItem('checkout-id', checkoutId)
        setLocalStorageCheckoutId(checkoutId)
        queryClient.setQueryData(getQueryKey(checkoutId), checkout)
      }
      return checkout
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
      const res = await fetch(
        getApiPath(`/checkout/${localStorageCheckoutId}`),
        {
          method: 'POST',
          body: JSON.stringify({ variantId, quantity }),
          headers: {
            'content-type': 'application/json'
          }
        }
      )
      const { checkout } = await res.json()
      return checkout
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
      const res = await fetch(
        getApiPath(`/checkout/${localStorageCheckoutId}`),
        {
          method: 'PUT',
          body: JSON.stringify({ variantId, quantity, putAction: 'update' }),
          headers: {
            'content-type': 'application/json'
          }
        }
      )
      const { checkout } = await res.json()
      return checkout
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
      const res = await fetch(
        getApiPath(`/checkout/${localStorageCheckoutId}`),
        {
          method: 'PUT',
          body: JSON.stringify({ variantId, putAction: 'remove' }),
          headers: {
            'content-type': 'application/json'
          }
        }
      )
      const { checkout } = await res.json()
      return checkout
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

export const ShopifyContextProvider: React.FC = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ContextProvider>{children}</ContextProvider>
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
