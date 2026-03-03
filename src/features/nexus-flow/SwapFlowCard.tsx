import { useMemo } from 'react'
import SwapWidget from '@/components/swaps/swap-widget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExecutionPayload } from '@/features/agent/schema'
import { toSupportedChainId, toSupportedToken } from './utils'

type SwapExecution = Extract<ExecutionPayload, { kind: 'swap' }>

export type FlowError = { code?: string; message: string; raw?: unknown }

interface SwapFlowCardProps {
  execution: SwapExecution
  disabled?: boolean
  onPreview?: (payload: unknown) => void
  onStateChange?: (state: { status: string; step?: string }) => void
  onError?: (error: FlowError) => void
  onComplete?: () => void
}

export function SwapFlowCard({
  execution,
  disabled = false,
  onPreview,
  onStateChange,
  onError,
  onComplete,
}: SwapFlowCardProps) {
  const prefill = useMemo(() => {
    const fromChainID = toSupportedChainId(execution.from_chain)
    const toChainID = toSupportedChainId(execution.to_chain)
    const fromToken = toSupportedToken(execution.token_in)
    const toToken = toSupportedToken(execution.token_out)
    if (!fromChainID || !toChainID || !fromToken || !toToken) return null

    return {
      fromChainID,
      toChainID,
      fromTokenSymbol: fromToken,
      toTokenSymbol: toToken,
      fromAmount: execution.amount,
    }
  }, [execution])

  if (!prefill) {
    return (
      <Card className="border-destructive/40 bg-card/60">
        <CardContent className="pt-5 text-sm text-destructive">
          Swap details could not be mapped to supported chains/tokens.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/70 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground/90">
          Swap {execution.amount} {execution.token_in} on {execution.from_chain} to{' '}
          {execution.token_out} on {execution.to_chain}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
          <SwapWidget
            embedded
            showHistory={false}
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

export default SwapFlowCard
