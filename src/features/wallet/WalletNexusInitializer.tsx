import { useEffect } from 'react'
import { type EthereumProvider } from '@avail-project/nexus-core'
import { useAccount, useConnectorClient } from 'wagmi'
import { useNexus } from '@/providers/NexusProvider'

type InitStatusPayload =
  | { status: 'disconnected' }
  | { status: 'initializing' }
  | { status: 'ready' }
  | { status: 'error'; message: string }

interface WalletNexusInitializerProps {
  enabled: boolean
  onStatusChange?: (payload: InitStatusPayload) => void
}

export function WalletNexusInitializer({
  enabled,
  onStatusChange,
}: WalletNexusInitializerProps) {
  const { isConnected, connector } = useAccount()
  const { data: walletClient } = useConnectorClient()
  const { handleInit, nexusSDK, loading } = useNexus()

  useEffect(() => {
    if (!enabled) return

    if (!isConnected) {
      onStatusChange?.({ status: 'disconnected' })
      return
    }

    if (nexusSDK) {
      onStatusChange?.({ status: 'ready' })
      return
    }

    let cancelled = false

    const init = async () => {
      onStatusChange?.({ status: 'initializing' })
      try {
        const mobileProvider = walletClient
          ? ({
              request: (args: unknown) => walletClient.request(args as never),
            } as EthereumProvider)
          : undefined

        const desktopProvider = (await connector?.getProvider()) as
          | EthereumProvider
          | undefined

        const provider = mobileProvider ?? desktopProvider

        if (!provider || typeof provider.request !== 'function') {
          throw new Error('Invalid EIP-1193 provider')
        }

        await handleInit(provider)
        if (!cancelled) {
          onStatusChange?.({ status: 'ready' })
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'Failed to initialize Nexus SDK.'
          onStatusChange?.({ status: 'error', message })
        }
      }
    }

    if (!loading) {
      void init()
    }

    return () => {
      cancelled = true
    }
  }, [
    enabled,
    isConnected,
    connector,
    walletClient,
    handleInit,
    loading,
    nexusSDK,
    onStatusChange,
  ])

  return null
}

export default WalletNexusInitializer
