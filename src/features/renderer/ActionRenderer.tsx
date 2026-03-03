import type { ReactNode } from 'react'
import type { AgentPlanV1, UIBlock } from '@/features/agent/schema'
import type { FlowError } from '@/features/nexus-flow/SwapFlowCard'
import type { WalletGateState } from '@/features/chat/types'
import IntentSummaryBlock from './blocks/IntentSummaryBlock'
import MissingInfoBlock from './blocks/MissingInfoBlock'
import WalletConnectRequestBlock from './blocks/WalletConnectRequestBlock'
import ExecutionCardBlock from './blocks/ExecutionCardBlock'
import RiskNoticeBlock from './blocks/RiskNoticeBlock'
import TxProgressBlock from './blocks/TxProgressBlock'
import TxResultBlock from './blocks/TxResultBlock'
import ErrorBlock from './blocks/ErrorBlock'

interface ActionRendererProps {
  plan: AgentPlanV1
  walletGateState: WalletGateState
  onWalletConnectConfirm?: () => void
  onFlowStateChange?: (state: { status: string; step?: string }) => void
  onFlowError?: (error: FlowError) => void
  onFlowComplete?: () => void
  onPreview?: (payload: unknown) => void
}

type BlockRenderContext = {
  block: UIBlock
  plan: AgentPlanV1
  walletGateState: WalletGateState
  onWalletConnectConfirm?: () => void
  onFlowStateChange?: (state: { status: string; step?: string }) => void
  onFlowError?: (error: FlowError) => void
  onFlowComplete?: () => void
  onPreview?: (payload: unknown) => void
}

type BlockRenderer = (context: BlockRenderContext) => ReactNode

const COMPONENT_REGISTRY: Record<UIBlock['type'], BlockRenderer> = {
  intent_summary: ({ block }) => <IntentSummaryBlock block={block} />,
  missing_info: ({ block }) => <MissingInfoBlock block={block} />,
  wallet_connect_request: ({ block, onWalletConnectConfirm, walletGateState }) => (
    <WalletConnectRequestBlock
      block={block}
      onConnectConfirm={onWalletConnectConfirm}
      disabled={
        walletGateState === 'connecting_wallet' ||
        walletGateState === 'wallet_connected_sdk_initializing'
      }
    />
  ),
  execution_card: ({
    block,
    plan,
    walletGateState,
    onFlowStateChange,
    onFlowError,
    onFlowComplete,
    onPreview,
  }) => (
    <ExecutionCardBlock
      block={block}
      execution={plan.execution}
      disabled={walletGateState !== 'ready_for_execution'}
      onStateChange={onFlowStateChange}
      onError={onFlowError}
      onComplete={onFlowComplete}
      onPreview={onPreview}
    />
  ),
  risk_notice: ({ block }) => <RiskNoticeBlock block={block} />,
  tx_progress: ({ block }) => <TxProgressBlock block={block} />,
  tx_result: ({ block }) => <TxResultBlock block={block} />,
  error: ({ block }) => <ErrorBlock block={block} />,
}

export function ActionRenderer({
  plan,
  walletGateState,
  onWalletConnectConfirm,
  onFlowStateChange,
  onFlowError,
  onFlowComplete,
  onPreview,
}: ActionRendererProps) {
  return (
    <div className="space-y-3">
      {plan.ui_blocks.map((block, index) => {
        const renderer = COMPONENT_REGISTRY[block.type]
        if (!renderer) {
          return (
            <ErrorBlock
              key={`unknown-${index}`}
              block={{
                type: 'error',
                message: `Unknown block type: ${String((block as { type?: string }).type ?? 'unknown')}`,
                code: 'unknown_block_type',
              }}
            />
          )
        }

        return (
          <div key={`${plan.intent_id}-${block.type}-${index}`}>
            {renderer({
              block,
              plan,
              walletGateState,
              onWalletConnectConfirm,
              onFlowStateChange,
              onFlowError,
              onFlowComplete,
              onPreview,
            })}
          </div>
        )
      })}
    </div>
  )
}

export default ActionRenderer
