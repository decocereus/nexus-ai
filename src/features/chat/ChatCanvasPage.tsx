import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, SendHorizontal } from 'lucide-react'
import { useModal } from 'connectkit'
import { useAccount } from 'wagmi'
import { useServerFn } from '@tanstack/react-start'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useNexus } from '@/providers/NexusProvider'
import { planAction } from '@/features/agent/planAction'
import type { AgentPlanV1, ExecutionPayload } from '@/features/agent/schema'
import ActionRenderer from '@/features/renderer/ActionRenderer'
import WalletNexusInitializer from '@/features/wallet/WalletNexusInitializer'
import { initPosthog, trackEvent, type AnalyticsDimensions } from '@/features/analytics/posthog'
import type { ChatMessage, WalletGateState } from './types'

function getExecutionDimensions(execution: ExecutionPayload | null): AnalyticsDimensions {
  if (!execution) return {}

  switch (execution.kind) {
    case 'swap':
      return {
        source_chain: execution.from_chain,
        destination_chain: execution.to_chain,
        token: `${execution.token_in}->${execution.token_out}`,
      }
    case 'bridge':
      return {
        destination_chain: execution.to_chain,
        token: execution.token,
      }
    case 'transfer':
      return {
        destination_chain: execution.to_chain,
        token: execution.token,
      }
    case 'deposit_supply':
    case 'deposit_withdraw':
      return {
        source_chain: execution.chain,
        destination_chain: execution.chain,
        token: execution.token,
        protocol: execution.protocol,
      }
    default:
      return {}
  }
}

function createMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
  return {
    ...message,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  }
}

export function ChatCanvasPage() {
  const planner = useServerFn(planAction)
  const { setOpen } = useModal()
  const { isConnected } = useAccount()
  const { nexusSDK } = useNexus()

  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage({
      role: 'assistant',
      text: 'Describe what you want to do. I can help with swap, bridge, transfer, and Aave USDC supply/withdraw on Base or Arbitrum.',
    }),
  ])
  const [inputValue, setInputValue] = useState('')
  const [isPlanning, setIsPlanning] = useState(false)
  const [walletGateState, setWalletGateState] = useState<WalletGateState>('idle')
  const [walletInitEnabled, setWalletInitEnabled] = useState(false)

  const planningStartedAtRef = useRef<number | null>(null)

  const latestPlan = useMemo<AgentPlanV1 | null>(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const plan = messages[index]?.plan
      if (plan) return plan
    }
    return null
  }, [messages])

  const syncWalletGateWithPlan = (plan: AgentPlanV1) => {
    if (!plan.requires_wallet) {
      setWalletGateState('idle')
      return
    }

    if (!isConnected) {
      setWalletGateState('needs_wallet_confirmation')
      trackEvent('wallet_connect_prompted', {
        intent_type: plan.intent_type,
        ...getExecutionDimensions(plan.execution),
      })
      return
    }

    if (nexusSDK) {
      setWalletGateState('ready_for_execution')
      return
    }

    setWalletGateState('wallet_connected_sdk_initializing')
    setWalletInitEnabled(true)
  }

  useEffect(() => {
    initPosthog()
  }, [])

  useEffect(() => {
    if (!latestPlan?.requires_wallet) {
      setWalletGateState('idle')
      return
    }

    if (!isConnected) {
      setWalletGateState('needs_wallet_confirmation')
      return
    }

    if (nexusSDK) {
      setWalletGateState('ready_for_execution')
      return
    }

    if (walletInitEnabled) {
      setWalletGateState('wallet_connected_sdk_initializing')
    }
  }, [latestPlan, isConnected, nexusSDK, walletInitEnabled])

  const handleSubmit = async () => {
    const userText = inputValue.trim()
    if (!userText || isPlanning) return

    setInputValue('')
    setIsPlanning(true)
    planningStartedAtRef.current = Date.now()

    setMessages((prev) => [...prev, createMessage({ role: 'user', text: userText })])

    try {
      const plan = await planner({
        data: {
          userText,
          context: {
            walletConnected: isConnected,
            network: 'mainnet',
          },
        },
      })

      const latency =
        planningStartedAtRef.current === null
          ? undefined
          : Date.now() - planningStartedAtRef.current

      trackEvent('intent_parsed', {
        intent_type: plan.intent_type,
        latency_ms: latency,
        ...getExecutionDimensions(plan.execution),
      })

      if (plan.intent_type === 'clarify') {
        trackEvent('intent_clarification_requested', {
          intent_type: plan.intent_type,
          ...getExecutionDimensions(plan.execution),
        })
      }

      const schemaFailed = plan.ui_blocks.some(
        (block) => block.type === 'error' && block.code === 'agent_schema_validation_failed',
      )
      if (schemaFailed) {
        trackEvent('agent_schema_validation_failed', {
          intent_type: plan.intent_type,
          ...getExecutionDimensions(plan.execution),
        })
      }

      setMessages((prev) => [
        ...prev,
        createMessage({
          role: 'assistant',
          text: plan.assistant_text,
          plan,
        }),
      ])

      syncWalletGateWithPlan(plan)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to parse request right now. Please try again.'

      setMessages((prev) => [
        ...prev,
        createMessage({
          role: 'assistant',
          text: message,
          plan: {
            version: '1.0',
            intent_id: crypto.randomUUID(),
            intent_type: 'clarify',
            confidence: 0,
            requires_wallet: false,
            missing_fields: ['protocol_action'],
            execution: null,
            assistant_text: message,
            ui_blocks: [
              {
                type: 'error',
                message,
                code: 'planning_failed',
              },
            ],
          },
        }),
      ])
    } finally {
      setIsPlanning(false)
      planningStartedAtRef.current = null
    }
  }

  const handleWalletConnectConfirm = () => {
    setWalletInitEnabled(true)
    setWalletGateState('connecting_wallet')
    setOpen(true)

    if (latestPlan) {
      trackEvent('wallet_connect_prompted', {
        intent_type: latestPlan.intent_type,
        ...getExecutionDimensions(latestPlan.execution),
      })
    }
  }

  return (
    <div className="relative min-h-screen bg-black text-zinc-100">
      <WalletNexusInitializer
        enabled={walletInitEnabled || Boolean(latestPlan?.requires_wallet && isConnected)}
        onStatusChange={(payload) => {
          switch (payload.status) {
            case 'disconnected':
              if (latestPlan?.requires_wallet) {
                setWalletGateState('needs_wallet_confirmation')
              }
              return
            case 'initializing':
              setWalletGateState('wallet_connected_sdk_initializing')
              trackEvent('wallet_connected', {
                intent_type: latestPlan?.intent_type,
                ...getExecutionDimensions(latestPlan?.execution ?? null),
              })
              return
            case 'ready':
              setWalletGateState('ready_for_execution')
              trackEvent('nexus_initialized', {
                intent_type: latestPlan?.intent_type,
                ...getExecutionDimensions(latestPlan?.execution ?? null),
              })
              return
            case 'error':
              setWalletGateState('needs_wallet_confirmation')
              trackEvent('tx_failed', {
                intent_type: latestPlan?.intent_type,
                error_code: 'nexus_init_failed',
                ...getExecutionDimensions(latestPlan?.execution ?? null),
              })
          }
        }}
      />

      <div className="mx-auto flex w-full max-w-4xl flex-col px-4 pb-40 pt-10 sm:px-6">
        <div className="space-y-6">
          {messages.map((message) => (
            <div key={message.id} className="space-y-3">
              <div
                className={`max-w-3xl rounded-xl border px-4 py-3 text-sm leading-relaxed ${
                  message.role === 'assistant'
                    ? 'border-zinc-800 bg-zinc-950/80 text-zinc-100'
                    : 'ml-auto border-zinc-700 bg-zinc-900 text-zinc-200'
                }`}
              >
                {message.text}
              </div>

              {message.role === 'assistant' && message.plan ? (
                <ActionRenderer
                  plan={message.plan}
                  walletGateState={walletGateState}
                  onWalletConnectConfirm={
                    walletGateState === 'needs_wallet_confirmation'
                      ? handleWalletConnectConfirm
                      : undefined
                  }
                  onPreview={() => {
                    trackEvent('preview_rendered', {
                      intent_type: message.plan?.intent_type,
                      ...getExecutionDimensions(message.plan?.execution ?? null),
                    })
                  }}
                  onFlowStateChange={(state) => {
                    if (state.status === 'executing') {
                      trackEvent('execute_clicked', {
                        intent_type: message.plan?.intent_type,
                        ...getExecutionDimensions(message.plan?.execution ?? null),
                      })
                      trackEvent('tx_started', {
                        intent_type: message.plan?.intent_type,
                        ...getExecutionDimensions(message.plan?.execution ?? null),
                      })
                    }
                    if (state.status === 'success') {
                      trackEvent('tx_succeeded', {
                        intent_type: message.plan?.intent_type,
                        ...getExecutionDimensions(message.plan?.execution ?? null),
                      })
                    }
                  }}
                  onFlowError={(error) => {
                    trackEvent('tx_failed', {
                      intent_type: message.plan?.intent_type,
                      error_code: error.code,
                      ...getExecutionDimensions(message.plan?.execution ?? null),
                    })
                  }}
                />
              ) : null}
            </div>
          ))}

          {isPlanning ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-300">
              <Loader2 className="size-4 animate-spin" />
              Planning your transaction...
            </div>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 px-4 sm:px-6">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-3 shadow-[0_0_50px_rgba(255,255,255,0.03)] backdrop-blur">
            <div className="flex items-end gap-2">
              <Textarea
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void handleSubmit()
                  }
                }}
                placeholder="Swap 50 USDC on Optimism to USDT on Arbitro"
                className="min-h-[56px] resize-none border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
              />
              <Button onClick={handleSubmit} disabled={isPlanning || inputValue.trim().length === 0}>
                <SendHorizontal className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Mainnet only. Supported intents: swap, bridge, transfer, Aave supply/withdraw (USDC on Base + Arbitrum).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatCanvasPage
