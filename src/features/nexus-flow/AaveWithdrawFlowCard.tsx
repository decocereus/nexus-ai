import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNexus } from '@/providers/NexusProvider'
import type { ExecutionPayload } from '@/features/agent/schema'
import type { FlowError } from './SwapFlowCard'
import { buildWithdrawExecute } from '@/features/protocols/aave/adapter'

type AaveWithdrawExecution = Extract<
  ExecutionPayload,
  { kind: 'deposit_withdraw' }
>

interface AaveWithdrawFlowCardProps {
  execution: AaveWithdrawExecution
  disabled?: boolean
  onStateChange?: (state: { status: string; step?: string }) => void
  onError?: (error: FlowError) => void
  onComplete?: () => void
}

export function AaveWithdrawFlowCard({
  execution,
  disabled = false,
  onStateChange,
  onError,
  onComplete,
}: AaveWithdrawFlowCardProps) {
  const { address } = useAccount()
  const { nexusSDK } = useNexus()
  const [status, setStatus] = useState<'idle' | 'executing' | 'success' | 'error'>(
    'idle',
  )
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null)

  const canExecute = useMemo(
    () => Boolean(address && nexusSDK && !disabled && status !== 'executing'),
    [address, nexusSDK, disabled, status],
  )

  const handleExecute = async () => {
    if (!address || !nexusSDK) {
      const error = {
        code: 'wallet_or_sdk_missing',
        message: 'Wallet connection and Nexus SDK initialization are required.',
      }
      setStatus('error')
      onStateChange?.({ status: 'error' })
      onError?.(error)
      return
    }

    try {
      setStatus('executing')
      onStateChange?.({ status: 'executing' })
      const params = buildWithdrawExecute({
        chain: execution.chain,
        token: 'USDC',
        amount: execution.amount,
        account: address,
      })

      const result = await nexusSDK.execute(params)
      setExplorerUrl(result.explorerUrl ?? null)
      setStatus('success')
      onStateChange?.({ status: 'success' })
      onComplete?.()
    } catch (rawError) {
      const message =
        rawError instanceof Error ? rawError.message : 'Aave withdraw failed.'
      const error = { message, raw: rawError }
      setStatus('error')
      onStateChange?.({ status: 'error' })
      onError?.(error)
    }
  }

  return (
    <Card className="bg-card/70 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground/90">
          Aave Withdraw: {execution.amount} USDC on {execution.chain}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          This executes Aave v3 withdraw directly on {execution.chain} and sends
          funds to your connected wallet.
        </p>

        <Button onClick={handleExecute} disabled={!canExecute}>
          {status === 'executing' ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Withdrawing...
            </>
          ) : (
            'Execute Withdraw'
          )}
        </Button>

        {status === 'success' && (
          <p className="text-emerald-400">
            Withdraw succeeded.
            {explorerUrl ? (
              <>
                {' '}
                <a
                  href={explorerUrl}
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  View on explorer
                </a>
              </>
            ) : null}
          </p>
        )}

        {status === 'error' && (
          <p className="text-destructive">
            Withdraw failed. Please review wallet state and try again.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default AaveWithdrawFlowCard
