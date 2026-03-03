import type { ExecutionPayload, UIBlock } from '@/features/agent/schema'
import SwapFlowCard, { type FlowError } from '@/features/nexus-flow/SwapFlowCard'
import BridgeFlowCard from '@/features/nexus-flow/BridgeFlowCard'
import TransferFlowCard from '@/features/nexus-flow/TransferFlowCard'
import AaveSupplyFlowCard from '@/features/nexus-flow/AaveSupplyFlowCard'
import AaveWithdrawFlowCard from '@/features/nexus-flow/AaveWithdrawFlowCard'

type ExecutionCard = Extract<UIBlock, { type: 'execution_card' }>

interface ExecutionCardBlockProps {
  block: ExecutionCard
  execution: ExecutionPayload | null
  disabled?: boolean
  onStateChange?: (state: { status: string; step?: string }) => void
  onError?: (error: FlowError) => void
  onComplete?: () => void
  onPreview?: (payload: unknown) => void
}

function IncompatibleExecutionCard() {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      Execution payload is missing or incompatible with the requested flow card.
    </div>
  )
}

export function ExecutionCardBlock({
  block,
  execution,
  disabled = false,
  onStateChange,
  onError,
  onComplete,
  onPreview,
}: ExecutionCardBlockProps) {
  if (!execution || execution.kind !== block.flow_kind) {
    return <IncompatibleExecutionCard />
  }

  switch (execution.kind) {
    case 'swap':
      return (
        <SwapFlowCard
          execution={execution}
          disabled={disabled}
          onStateChange={onStateChange}
          onError={onError}
          onComplete={onComplete}
          onPreview={onPreview}
        />
      )
    case 'bridge':
      return (
        <BridgeFlowCard
          execution={execution}
          disabled={disabled}
          onStateChange={onStateChange}
          onError={onError}
          onComplete={onComplete}
          onPreview={onPreview}
        />
      )
    case 'transfer':
      return (
        <TransferFlowCard
          execution={execution}
          disabled={disabled}
          onStateChange={onStateChange}
          onError={onError}
          onComplete={onComplete}
          onPreview={onPreview}
        />
      )
    case 'deposit_supply':
      return (
        <AaveSupplyFlowCard
          execution={execution}
          disabled={disabled}
          onStateChange={onStateChange}
          onError={onError}
          onComplete={onComplete}
        />
      )
    case 'deposit_withdraw':
      return (
        <AaveWithdrawFlowCard
          execution={execution}
          disabled={disabled}
          onStateChange={onStateChange}
          onError={onError}
          onComplete={onComplete}
        />
      )
    default:
      return <IncompatibleExecutionCard />
  }
}

export default ExecutionCardBlock
