import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { isAddress } from 'viem'
import FastTransfer from '@/components/transfer/transfer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExecutionPayload } from '@/features/agent/schema'
import { toSupportedChainId, toSupportedToken } from './utils'
import type { FlowError } from './SwapFlowCard'

type TransferExecution = Extract<ExecutionPayload, { kind: 'transfer' }>

interface TransferFlowCardProps {
  execution: TransferExecution
  disabled?: boolean
  onPreview?: (payload: unknown) => void
  onStateChange?: (state: { status: string; step?: string }) => void
  onError?: (error: FlowError) => void
  onComplete?: () => void
}

export function TransferFlowCard({
  execution,
  disabled = false,
  onPreview,
  onStateChange,
  onError,
  onComplete,
}: TransferFlowCardProps) {
  const { address } = useAccount()

  const prefill = useMemo(() => {
    const chainId = toSupportedChainId(execution.to_chain)
    const token = toSupportedToken(execution.token)
    if (!chainId || !token || !isAddress(execution.recipient)) return null

    return {
      chainId,
      token,
      amount: execution.amount,
      recipient: execution.recipient,
    }
  }, [execution])

  if (!address || !prefill) {
    return (
      <Card className="border-destructive/40 bg-card/60">
        <CardContent className="pt-5 text-sm text-destructive">
          Transfer details are incomplete or recipient is invalid.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/70 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground/90">
          Transfer {execution.amount} {execution.token} to {execution.recipient} on{' '}
          {execution.to_chain}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
          <FastTransfer
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

export default TransferFlowCard
