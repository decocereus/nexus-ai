import { z } from 'zod'
import {
  type AgentPlanV1,
  AgentPlanV1Schema,
  type MissingField,
} from './schema'
import {
  normalizeChainName,
  normalizeExecutionPayload,
  normalizeTokenSymbol,
  normalizeUserInput,
} from './normalize'
import { buildAgentSystemPrompt } from './prompt'

const PlanActionInputSchema = z.object({
  userText: z.string().min(1),
  context: z
    .object({
      walletConnected: z.boolean().optional(),
      network: z.string().optional(),
      account: z.string().optional(),
    })
    .optional(),
})

type PlanActionInput = z.infer<typeof PlanActionInputSchema>

const KNOWN_TOKENS = ['USDC', 'USDT', 'DAI', 'ETH', 'WETH', 'WBTC'] as const
const KNOWN_CHAINS = [
  'ethereum',
  'optimism',
  'arbitrum',
  'base',
  'polygon',
  'avalanche',
  'bsc',
  'scroll',
] as const

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

function findAmount(text: string): string | null {
  const amountMatch = text.match(/(?:^|\s)(\d+(?:\.\d+)?)(?:\s|$)/)
  return amountMatch?.[1] ?? null
}

function findRecipient(text: string): string | null {
  const addressMatch = text.match(/0x[a-fA-F0-9]{40}/)
  return addressMatch?.[0] ?? null
}

function findTokens(text: string): string[] {
  const normalized = text.toUpperCase()
  const hits: Array<{ token: string; index: number }> = []

  for (const token of KNOWN_TOKENS) {
    const regex = new RegExp(`\\b${token}\\b`, 'gi')
    for (const match of normalized.matchAll(regex)) {
      hits.push({ token, index: match.index ?? Number.MAX_SAFE_INTEGER })
    }
  }

  hits.sort((a, b) => a.index - b.index)
  return hits.map((hit) => hit.token)
}

function findChains(text: string): string[] {
  const normalized = text.toLowerCase()
  const hits: Array<{ chain: string; index: number }> = []

  for (const chain of KNOWN_CHAINS) {
    const regex = new RegExp(`\\b${chain}\\b`, 'gi')
    for (const match of normalized.matchAll(regex)) {
      hits.push({ chain, index: match.index ?? Number.MAX_SAFE_INTEGER })
    }
  }

  hits.sort((a, b) => a.index - b.index)
  return hits.map((hit) => normalizeChainName(hit.chain))
}

function buildClarifyPlan(
  userText: string,
  missingFields: MissingField[],
  reason?: string,
): AgentPlanV1 {
  const details =
    reason ?? 'I need a few details before I can execute this safely.'
  return {
    version: '1.0',
    intent_id: crypto.randomUUID(),
    intent_type: 'clarify',
    confidence: 0.4,
    requires_wallet: false,
    missing_fields: missingFields,
    execution: null,
    assistant_text: `${details} Please provide ${missingFields.join(', ')}.`,
    ui_blocks: [
      {
        type: 'intent_summary',
        title: 'Need a quick clarification',
        lines: [userText],
      },
      {
        type: 'missing_info',
        fields: missingFields,
        prompt: 'Please provide the missing details to continue.',
      },
    ],
  }
}

function buildHeuristicPlan(input: PlanActionInput): AgentPlanV1 {
  const normalized = normalizeUserInput(input.userText)
  const text = normalized.normalized.toLowerCase()
  const amount = findAmount(text)
  const tokens = findTokens(normalized.normalized)
  const chains = findChains(text)
  const recipient = findRecipient(input.userText)

  if (text.includes('withdraw') && text.includes('aave')) {
    const chain = chains.find(
      (value) => value === 'base' || value === 'arbitrum',
    )
    const missing: MissingField[] = []
    if (!amount) missing.push('amount')
    if (!chain) missing.push('from_chain')
    if (missing.length > 0) return buildClarifyPlan(input.userText, missing)

    return {
      version: '1.0',
      intent_id: crypto.randomUUID(),
      intent_type: 'deposit_withdraw',
      confidence: 0.76,
      requires_wallet: true,
      missing_fields: [],
      execution: {
        kind: 'deposit_withdraw',
        protocol: 'aave_v3',
        token: 'USDC',
        chain,
        amount,
      },
      assistant_text: `I prepared an Aave withdraw on ${chain} for ${amount} USDC.`,
      ui_blocks: [
        {
          type: 'intent_summary',
          title: 'Aave Withdraw Plan',
          lines: [`Withdraw ${amount} USDC from Aave on ${chain}.`],
        },
        {
          type: 'wallet_connect_request',
          reason:
            'Wallet connection is required to prepare and execute this transaction.',
        },
        {
          type: 'execution_card',
          flow_kind: 'deposit_withdraw',
          execution_ref: 'execution',
        },
      ],
    }
  }

  if (
    (text.includes('deposit') || text.includes('supply')) &&
    text.includes('aave')
  ) {
    const chain = chains.find(
      (value) => value === 'base' || value === 'arbitrum',
    )
    const missing: MissingField[] = []
    if (!amount) missing.push('amount')
    if (!chain) missing.push('to_chain')
    if (missing.length > 0) return buildClarifyPlan(input.userText, missing)

    return {
      version: '1.0',
      intent_id: crypto.randomUUID(),
      intent_type: 'deposit_supply',
      confidence: 0.76,
      requires_wallet: true,
      missing_fields: [],
      execution: {
        kind: 'deposit_supply',
        protocol: 'aave_v3',
        token: 'USDC',
        chain,
        amount,
      },
      assistant_text: `I prepared an Aave supply on ${chain} for ${amount} USDC.`,
      ui_blocks: [
        {
          type: 'intent_summary',
          title: 'Aave Supply Plan',
          lines: [`Supply ${amount} USDC to Aave on ${chain}.`],
        },
        {
          type: 'wallet_connect_request',
          reason:
            'Wallet connection is required to prepare and execute this transaction.',
        },
        {
          type: 'execution_card',
          flow_kind: 'deposit_supply',
          execution_ref: 'execution',
        },
      ],
    }
  }

  if (text.includes('swap')) {
    const tokenIn = tokens[0]
    const tokenOut = tokens[1]
    const fromChain = chains[0]
    const toChain = chains[1]
    const missing: MissingField[] = []
    if (!amount) missing.push('amount')
    if (!tokenIn || !tokenOut) missing.push('token')
    if (!fromChain) missing.push('from_chain')
    if (!toChain) missing.push('to_chain')
    if (missing.length > 0) return buildClarifyPlan(input.userText, missing)

    return {
      version: '1.0',
      intent_id: crypto.randomUUID(),
      intent_type: 'swap',
      confidence: 0.72,
      requires_wallet: true,
      missing_fields: [],
      execution: {
        kind: 'swap',
        token_in: normalizeTokenSymbol(tokenIn),
        token_out: normalizeTokenSymbol(tokenOut),
        from_chain: fromChain,
        to_chain: toChain,
        amount,
      },
      assistant_text: `I prepared a ${amount} ${tokenIn} -> ${tokenOut} swap from ${fromChain} to ${toChain}.`,
      ui_blocks: [
        {
          type: 'intent_summary',
          title: 'Swap Plan',
          lines: [
            `Swap ${amount} ${tokenIn} on ${fromChain} to ${tokenOut} on ${toChain}.`,
          ],
        },
        {
          type: 'wallet_connect_request',
          reason:
            'Wallet connection is required to prepare and execute this transaction.',
        },
        {
          type: 'execution_card',
          flow_kind: 'swap',
          execution_ref: 'execution',
        },
      ],
    }
  }

  if (text.includes('transfer')) {
    const token = tokens[0]
    const toChain = chains[0]
    const missing: MissingField[] = []
    if (!amount) missing.push('amount')
    if (!token) missing.push('token')
    if (!toChain) missing.push('to_chain')
    if (!recipient) missing.push('recipient')
    if (missing.length > 0) return buildClarifyPlan(input.userText, missing)

    return {
      version: '1.0',
      intent_id: crypto.randomUUID(),
      intent_type: 'transfer',
      confidence: 0.72,
      requires_wallet: true,
      missing_fields: [],
      execution: {
        kind: 'transfer',
        token: normalizeTokenSymbol(token),
        to_chain: toChain,
        amount,
        recipient,
      },
      assistant_text: `I prepared a transfer of ${amount} ${token} to ${recipient} on ${toChain}.`,
      ui_blocks: [
        {
          type: 'intent_summary',
          title: 'Transfer Plan',
          lines: [`Transfer ${amount} ${token} to ${recipient} on ${toChain}.`],
        },
        {
          type: 'wallet_connect_request',
          reason:
            'Wallet connection is required to prepare and execute this transaction.',
        },
        {
          type: 'execution_card',
          flow_kind: 'transfer',
          execution_ref: 'execution',
        },
      ],
    }
  }

  if (text.includes('bridge')) {
    const token = tokens[0]
    const toChain = chains[0]
    const missing: MissingField[] = []
    if (!amount) missing.push('amount')
    if (!token) missing.push('token')
    if (!toChain) missing.push('to_chain')
    if (missing.length > 0) return buildClarifyPlan(input.userText, missing)

    return {
      version: '1.0',
      intent_id: crypto.randomUUID(),
      intent_type: 'bridge',
      confidence: 0.72,
      requires_wallet: true,
      missing_fields: [],
      execution: {
        kind: 'bridge',
        token: normalizeTokenSymbol(token),
        to_chain: toChain,
        amount,
      },
      assistant_text: `I prepared a bridge of ${amount} ${token} to ${toChain}.`,
      ui_blocks: [
        {
          type: 'intent_summary',
          title: 'Bridge Plan',
          lines: [`Bridge ${amount} ${token} to ${toChain}.`],
        },
        {
          type: 'wallet_connect_request',
          reason:
            'Wallet connection is required to prepare and execute this transaction.',
        },
        {
          type: 'execution_card',
          flow_kind: 'bridge',
          execution_ref: 'execution',
        },
      ],
    }
  }

  return buildClarifyPlan(input.userText, ['protocol_action'])
}

function sanitizePlan(plan: AgentPlanV1): AgentPlanV1 {
  const normalizedExecution =
    plan.execution === null ? null : normalizeExecutionPayload(plan.execution)

  return {
    ...plan,
    confidence: clampConfidence(plan.confidence),
    execution: normalizedExecution,
    ui_blocks:
      plan.ui_blocks.length > 0
        ? plan.ui_blocks
        : [
            {
              type: 'error',
              message: 'No renderable UI blocks were returned by the planner.',
              code: 'empty_ui_blocks',
            },
          ],
  }
}

async function buildModelPlan(input: PlanActionInput): Promise<AgentPlanV1> {
  const normalized = normalizeUserInput(input.userText)
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return buildHeuristicPlan(input)
  }

  const [{ generateObject }, { createOpenRouter }] = await Promise.all([
    import('ai'),
    import('@openrouter/ai-sdk-provider'),
  ])

  const openrouter = createOpenRouter({
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    compatibility: 'strict',
    headers: {
      ...(process.env.OPENROUTER_HTTP_REFERER
        ? { 'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER }
        : {}),
      ...(process.env.OPENROUTER_APP_TITLE
        ? { 'X-Title': process.env.OPENROUTER_APP_TITLE }
        : {}),
    },
  })

  const result = await generateObject({
    model: openrouter(process.env.OPENROUTER_MODEL ?? 'moonshotai/kimi-k2.5'),
    schema: AgentPlanV1Schema,
    temperature: 0,
    system: buildAgentSystemPrompt(),
    prompt: JSON.stringify({
      user_input: normalized.normalized,
      context: input.context ?? {},
      aliases_applied: normalized.aliases,
      constraints: {
        network: 'mainnet',
        supported_intents: [
          'swap',
          'bridge',
          'transfer',
          'deposit_supply',
          'deposit_withdraw',
        ],
        supported_aave: {
          protocol: 'aave_v3',
          token: 'USDC',
          chains: ['base', 'arbitrum'],
        },
      },
    }),
  })

  return sanitizePlan(AgentPlanV1Schema.parse(result.object))
}

export async function runPlanAction(
  data: PlanActionInput,
): Promise<AgentPlanV1> {
  const parsedInput = PlanActionInputSchema.parse(data)
  try {
    const plan = await buildModelPlan(parsedInput)
    const parsed = AgentPlanV1Schema.safeParse(plan)
    if (!parsed.success) {
      const fallback = buildClarifyPlan(parsedInput.userText, [
        'protocol_action',
      ])
      return {
        ...fallback,
        ui_blocks: [
          ...fallback.ui_blocks,
          {
            type: 'error' as const,
            message: 'Planner output failed schema validation.',
            code: 'agent_schema_validation_failed',
          },
        ],
      }
    }
    return parsed.data
  } catch {
    return buildHeuristicPlan(parsedInput)
  }
}
