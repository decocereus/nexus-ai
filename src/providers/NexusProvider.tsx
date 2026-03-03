'use client'
import {
  type EthereumProvider,
  type NexusNetwork,
  NexusSDK,
  type OnAllowanceHookData,
  type OnIntentHookData,
  type OnSwapIntentHookData,
  type SupportedChainsAndTokensResult,
  type SupportedChainsResult,
  type UserAsset,
} from '@avail-project/nexus-core'

import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAccountEffect } from 'wagmi'
import {
  DEFAULT_USD_PEGGED_TOKEN_SYMBOLS,
  USD_PEGGED_FALLBACK_RATE,
  buildUsdPeggedSymbolSet,
  fetchCoinbaseUsdRate,
  getCoinbaseSymbolCandidates,
  normalizeTokenSymbol,
  toFinitePositiveNumber,
} from '../components/common/utils/token-pricing'

interface NexusContextType {
  nexusSDK: NexusSDK | null
  bridgableBalance: UserAsset[] | null
  swapBalance: UserAsset[] | null
  intent: RefObject<OnIntentHookData | null>
  allowance: RefObject<OnAllowanceHookData | null>
  swapIntent: RefObject<OnSwapIntentHookData | null>
  exchangeRate: Record<string, number> | null
  supportedChainsAndTokens: SupportedChainsAndTokensResult | null
  swapSupportedChainsAndTokens: SupportedChainsResult | null
  network?: NexusNetwork
  loading: boolean
  handleInit: (provider: EthereumProvider) => Promise<void>
  fetchBridgableBalance: () => Promise<void>
  fetchSwapBalance: () => Promise<void>
  getFiatValue: (amount: number, token: string) => number
  resolveTokenUsdRate: (tokenSymbol: string) => Promise<number | null>
  initializeNexus: (provider: EthereumProvider) => Promise<void>
  deinitializeNexus: () => Promise<void>
  attachEventHooks: () => void
}

const NexusContext = createContext<NexusContextType | undefined>(undefined)

type NexusProviderProps = {
  children: React.ReactNode
  config?: {
    network?: NexusNetwork
    debug?: boolean
  }
}

const defaultConfig: Required<NexusProviderProps['config']> = {
  network: 'mainnet',
  debug: false,
}

const NexusProvider = ({
  children,
  config = defaultConfig,
}: NexusProviderProps) => {
  const stableConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config],
  )

  const sdkRef = useRef<NexusSDK | null>(null)
  sdkRef.current ??= new NexusSDK({
    ...stableConfig,
  })
  const sdk = sdkRef.current

  const [nexusSDK, setNexusSDK] = useState<NexusSDK | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const supportedChainsAndTokens =
    useRef<SupportedChainsAndTokensResult | null>(null)
  const swapSupportedChainsAndTokens = useRef<SupportedChainsResult | null>(
    null,
  )
  const [bridgableBalance, setBridgableBalance] = useState<UserAsset[] | null>(
    null,
  )
  const [swapBalance, setSwapBalance] = useState<UserAsset[] | null>(null)
  const [exchangeRateState, setExchangeRateState] = useState<Record<
    string,
    number
  > | null>(null)
  const exchangeRate = useRef<Record<string, number> | null>(null)
  const coinbaseUsdRateCache = useRef<Record<string, number>>({})
  const coinbaseUsdRateRequests = useRef<
    Record<string, Promise<number | null>>
  >({})
  const usdPeggedSymbols = useRef<Set<string>>(
    new Set(DEFAULT_USD_PEGGED_TOKEN_SYMBOLS),
  )

  const intent = useRef<OnIntentHookData | null>(null)
  const allowance = useRef<OnAllowanceHookData | null>(null)
  const swapIntent = useRef<OnSwapIntentHookData | null>(null)

  const cacheUsdRate = useCallback((tokenSymbol: string, usdRate: number) => {
    const normalized = normalizeTokenSymbol(tokenSymbol)
    const rate = toFinitePositiveNumber(usdRate)
    if (!normalized || !rate) return

    coinbaseUsdRateCache.current[normalized] = rate
    const currentRates = exchangeRate.current ?? {}
    if (currentRates[normalized] === rate) return

    const nextRates = {
      ...currentRates,
      [normalized]: rate,
    }
    exchangeRate.current = nextRates
    setExchangeRateState(nextRates)
  }, [])

  const resolveTokenUsdRate = useCallback(
    async (tokenSymbol: string) => {
      const normalizedSymbol = normalizeTokenSymbol(tokenSymbol)
      if (!normalizedSymbol) return null

      const sdkRate = toFinitePositiveNumber(
        exchangeRate.current?.[normalizedSymbol],
      )
      if (sdkRate) {
        return sdkRate
      }

      const cachedRate = toFinitePositiveNumber(
        coinbaseUsdRateCache.current[normalizedSymbol],
      )
      if (cachedRate) {
        return cachedRate
      }

      const inFlightRequest = coinbaseUsdRateRequests.current[normalizedSymbol]
      if (inFlightRequest) {
        return inFlightRequest
      }

      const requestPromise = (async (): Promise<number | null> => {
        for (const candidate of getCoinbaseSymbolCandidates(normalizedSymbol)) {
          const sdkCandidateRate = toFinitePositiveNumber(
            exchangeRate.current?.[candidate],
          )
          if (sdkCandidateRate) {
            cacheUsdRate(normalizedSymbol, sdkCandidateRate)
            return sdkCandidateRate
          }

          const cachedCandidateRate = toFinitePositiveNumber(
            coinbaseUsdRateCache.current[candidate],
          )
          if (cachedCandidateRate) {
            cacheUsdRate(normalizedSymbol, cachedCandidateRate)
            return cachedCandidateRate
          }
        }

        const coinbaseRate = await fetchCoinbaseUsdRate(normalizedSymbol)
        if (coinbaseRate) {
          cacheUsdRate(normalizedSymbol, coinbaseRate)
          return coinbaseRate
        }

        if (usdPeggedSymbols.current.has(normalizedSymbol)) {
          cacheUsdRate(normalizedSymbol, USD_PEGGED_FALLBACK_RATE)
          return USD_PEGGED_FALLBACK_RATE
        }

        return null
      })()

      coinbaseUsdRateRequests.current[normalizedSymbol] = requestPromise
      try {
        return await requestPromise
      } finally {
        delete coinbaseUsdRateRequests.current[normalizedSymbol]
      }
    },
    [cacheUsdRate],
  )

  const setupNexus = useCallback(async () => {
    const list = sdk.utils.getSupportedChains(
      config?.network === 'testnet' ? 0 : undefined,
    )
    supportedChainsAndTokens.current = list ?? null
    usdPeggedSymbols.current = buildUsdPeggedSymbolSet(list ?? null)
    const swapList = sdk.utils.getSwapSupportedChainsAndTokens()
    swapSupportedChainsAndTokens.current = swapList ?? null
    const [bridgeAbleBalanceResult, rates] = await Promise.allSettled([
      sdk.getBalancesForBridge(),
      sdk.utils.getCoinbaseRates(),
    ])

    if (bridgeAbleBalanceResult.status === 'fulfilled') {
      setBridgableBalance(bridgeAbleBalanceResult.value)
    }

    if (rates?.status === 'fulfilled') {
      // Coinbase returns "units per USD" (e.g., 1 USD = 0.00028 ETH).
      // Convert to "USD per unit" (e.g., 1 ETH = ~$3514) for straightforward UI calculations.
      const usdPerUnit: Record<string, number> = {}

      for (const [symbol, value] of Object.entries(rates.value)) {
        const unitsPerUsd = Number.parseFloat(String(value))
        if (Number.isFinite(unitsPerUsd) && unitsPerUsd > 0) {
          usdPerUnit[normalizeTokenSymbol(symbol)] = 1 / unitsPerUsd
        }
      }
      exchangeRate.current = usdPerUnit
      setExchangeRateState(usdPerUnit)
    }
  }, [sdk, config?.network])

  const initializeNexus = useCallback(
    async (provider: EthereumProvider) => {
      setLoading(true)
      try {
        if (!sdk.isInitialized()) {
          await sdk.initialize(provider)
        }
        setNexusSDK(sdk)
      } catch (error) {
        console.error('Error initializing Nexus:', error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [sdk],
  )

  const deinitializeNexus = useCallback(async () => {
    try {
      if (!nexusSDK) throw new Error('Nexus is not initialized')
      await nexusSDK?.deinit()
      setNexusSDK(null)
      supportedChainsAndTokens.current = null
      swapSupportedChainsAndTokens.current = null
      setBridgableBalance(null)
      setSwapBalance(null)
      exchangeRate.current = null
      setExchangeRateState(null)
      coinbaseUsdRateCache.current = {}
      coinbaseUsdRateRequests.current = {}
      usdPeggedSymbols.current = new Set(DEFAULT_USD_PEGGED_TOKEN_SYMBOLS)
      intent.current = null
      swapIntent.current = null
      allowance.current = null
      setLoading(false)
    } catch (error) {
      console.error('Error deinitializing Nexus:', error)
    }
  }, [nexusSDK])

  const attachEventHooks = useCallback(() => {
    sdk.setOnAllowanceHook((data: OnAllowanceHookData) => {
      /**
       * Useful when you want the user to select, min, max or a custom value
       * Can use this to capture data and then show it on the UI
       * @see - always call data.allow() to progress the flow, otherwise it will stay stuck here.
       * const {allow, sources, deny} = data
       * @example allow(['min', 'max', '0.5']), the array in allow function should match number of sources.
       * You can skip setting this hook if you want, sdk will auto progress if this hook is not attached
       */
      allowance.current = data
    })

    sdk.setOnIntentHook((data: OnIntentHookData) => {
      /**
       * Useful when you want to capture the intent, and display it on the UI (bridge, bridgeAndTransfer, bridgeAndExecute)
       * const {allow, deny, intent, refresh} = data
       * @see - always call data.allow() to progress the flow, otherwise it will stay stuck here.
       * deny() to reject the intent
       * refresh() to refresh the intent, best to call refresh in 15 second intervals
       * data.intent -> details about the intent, useful when wanting to display info on UI
       * You can skip setting this hook if you want, sdk will auto progress if this hook is not attached
       */
      intent.current = data
    })

    sdk.setOnSwapIntentHook((data: OnSwapIntentHookData) => {
      /**
       * Same behaviour and function as setOnIntentHook, except this one is for swaps exclusively
       */
      swapIntent.current = data
    })
  }, [sdk])

  const handleInit = useCallback(
    async (provider: EthereumProvider) => {
      if (sdk.isInitialized() || loading) {
        return
      }
      if (!provider || typeof provider.request !== 'function') {
        throw new Error('Invalid EIP-1193 provider')
      }
      try {
        await initializeNexus(provider)
        if (!sdk.isInitialized()) return
        await setupNexus()
        attachEventHooks()
      } catch (error) {
        console.error('Error during Nexus setup flow:', error)
        throw error
      }
    },
    [sdk, loading, initializeNexus, setupNexus, attachEventHooks],
  )

  const fetchBridgableBalance = useCallback(async () => {
    try {
      const updatedBalance = await sdk.getBalancesForBridge()
      setBridgableBalance(updatedBalance)
    } catch (error) {
      console.error('Error fetching bridgable balance:', error)
    }
  }, [sdk])

  const fetchSwapBalance = useCallback(async () => {
    try {
      const updatedBalance = await sdk.getBalancesForSwap()
      setSwapBalance(updatedBalance)
    } catch (error) {
      console.error('Error fetching swap balance:', error)
    }
  }, [sdk])

  const getFiatValue = useCallback((amount: number, token: string) => {
    const key = normalizeTokenSymbol(token)
    const rate =
      toFinitePositiveNumber(exchangeRate.current?.[key]) ??
      toFinitePositiveNumber(coinbaseUsdRateCache.current[key]) ??
      (usdPeggedSymbols.current.has(key) ? USD_PEGGED_FALLBACK_RATE : 0)
    return rate * amount
  }, [])

  useAccountEffect({
    onDisconnect() {
      deinitializeNexus()
    },
  })

  const value = useMemo(
    () => ({
      nexusSDK,
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      intent,
      allowance,
      handleInit,
      supportedChainsAndTokens: supportedChainsAndTokens.current,
      swapSupportedChainsAndTokens: swapSupportedChainsAndTokens.current,
      bridgableBalance,
      swapBalance: swapBalance,
      network: config?.network,
      loading,
      fetchBridgableBalance,
      fetchSwapBalance,
      swapIntent,
      exchangeRate: exchangeRateState,
      getFiatValue,
      resolveTokenUsdRate,
    }),
    [
      nexusSDK,
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      handleInit,
      bridgableBalance,
      swapBalance,
      config,
      loading,
      fetchBridgableBalance,
      fetchSwapBalance,
      exchangeRateState,
      getFiatValue,
      resolveTokenUsdRate,
    ],
  )
  return <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
}

export function useNexus() {
  const context = useContext(NexusContext)
  if (!context) {
    throw new Error('useNexus must be used within a NexusProvider')
  }
  return context
}

export default NexusProvider
