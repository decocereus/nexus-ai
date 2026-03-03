import { useAccount } from 'wagmi'
import BridgeDeposit from '@/components/bridge-deposit/deposit'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExecutionPayload } from '@/features/agent/schema'
import type { FlowError } from './SwapFlowCard'
import { buildSupplyExecute } from '@/features/protocols/aave/adapter'
import { AAVE_V3_CONFIG } from '@/features/protocols/aave/config'

type AaveSupplyExecution = Extract<ExecutionPayload, { kind: 'deposit_supply' }>

interface AaveSupplyFlowCardProps {
  execution: AaveSupplyExecution
  disabled?: boolean
  onStateChange?: (state: { status: string; step?: string }) => void
  onError?: (error: FlowError) => void
  onComplete?: () => void
}

export function AaveSupplyFlowCard({
  execution,
  disabled = false,
  onStateChange,
  onError,
  onComplete,
}: AaveSupplyFlowCardProps) {
  const { address } = useAccount()

  if (!address) {
    return (
      <Card className="border-destructive/40 bg-card/60">
        <CardContent className="pt-5 text-sm text-destructive">
          Connect your wallet to supply to Aave.
        </CardContent>
      </Card>
    )
  }

  const chainConfig = AAVE_V3_CONFIG[execution.chain]

  return (
    <Card className="bg-card/70 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground/90">
          Aave Supply: {execution.amount} USDC on {execution.chain}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
          <BridgeDeposit
            address={address}
            token="USDC"
            chain={chainConfig.chainId}
            heading={`Supply USDC to Aave (${execution.chain})`}
            embed
            destinationLabel={`on Aave v3 ${execution.chain}`}
            onStateChange={onStateChange}
            showHistory={false}
            depositExecute={(_token, amount, _chainId, userAddress) => {
              onStateChange?.({ status: 'preview' })
              const params = buildSupplyExecute({
                chain: execution.chain,
                token: 'USDC',
                amount,
                account: userAddress,
              })
              return {
                to: params.to,
                data: params.data,
                gas: params.gas,
                gasPrice: params.gasPrice,
                value: params.value,
                tokenApproval: params.tokenApproval,
              }
            }}
            onStart={() => onStateChange?.({ status: 'executing' })}
            onComplete={() => {
              onStateChange?.({ status: 'success' })
              onComplete?.()
            }}
            onError={(error) => {
              onStateChange?.({ status: 'error' })
              onError?.(error)
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default AaveSupplyFlowCard
