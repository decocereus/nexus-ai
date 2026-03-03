import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { isAddress } from 'viem'
import FastBridge from '@/components/fast-bridge/fast-bridge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExecutionPayload } from '@/features/agent/schema'
import { toSupportedChainId, toSupportedToken } from './utils'
import type { FlowError } from './SwapFlowCard'

type BridgeExecution = Extract<ExecutionPayload, { kind: 'bridge' }>

interface BridgeFlowCardProps {
  execution: BridgeExecution
  disabled?: boolean
  onPreview?: (payload: unknown) => void
  onStateChange?: (state: { status: string; step?: string }) => void
  onError?: (error: FlowError) => void
  onComplete?: () => void
}

export function BridgeFlowCard({
  execution,
  disabled = false,
  onPreview,
  onStateChange,
  onError,
  onComplete,
}: BridgeFlowCardProps) {
  const { address } = useAccount()

  const prefill = useMemo(() => {
    const chainId = toSupportedChainId(execution.to_chain)
    const token = toSupportedToken(execution.token)
    if (!chainId || !token) return null

    return {
      chainId,
      token,
      amount: execution.amount,
      recipient:
        execution.recipient && isAddress(execution.recipient)
          ? execution.recipient
          : undefined,
    }
  }, [execution])

  if (!address || !prefill) {
    return (
      <Card className="border-destructive/40 bg-card/60">
        <CardContent className="pt-5 text-sm text-destructive">
          Bridge details are incomplete or wallet is not connected.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/70 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground/90">
          Bridge {execution.amount} {execution.token} to {execution.to_chain}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
          <FastBridge
            embedded
            showHistory={false}
            connectedAddress={address}
            prefill={prefill}
            onPreview={onPreview}
            onStateChange={onStateChange}
            onComplete={() => onComplete?.()}
            onError={(error) => onError?.(error)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default BridgeFlowCard
