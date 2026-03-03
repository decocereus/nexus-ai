import type { AgentPlanV1 } from '@/features/agent/schema'

export type WalletGateState =
  | 'idle'
  | 'needs_wallet_confirmation'
  | 'connecting_wallet'
  | 'wallet_connected_sdk_initializing'
  | 'ready_for_execution'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: number
  plan?: AgentPlanV1
}
