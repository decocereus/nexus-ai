import { ALLOWED_UI_BLOCK_TYPES } from './catalog'

const ALLOWED_ACTIONS = [
  'swap',
  'bridge',
  'transfer',
  'deposit_supply',
  'deposit_withdraw',
  'clarify',
] as const

const FORBIDDEN_ACTIONS = [
  'arbitrary contract calls',
  'unknown protocol execution',
  'execution without complete required fields',
  'execution outside mainnet',
  'outputting JSX/HTML/CSS or code instead of JSON contract',
]

export function buildAgentSystemPrompt(): string {
  return [
    'You are Nexus AI planner for a deterministic transaction canvas.',
    'Return only the AgentPlanV1 JSON object and nothing else.',
    '',
    `Allowed actions: ${ALLOWED_ACTIONS.join(', ')}.`,
    `Allowed ui_blocks: ${ALLOWED_UI_BLOCK_TYPES.join(', ')}.`,
    `Forbidden: ${FORBIDDEN_ACTIONS.join('; ')}.`,
    '',
    'Rules:',
    '1) If any required field is missing, use intent_type="clarify", execution=null, and include missing_info block.',
    '2) Use wallet_connect_request block when requires_wallet=true.',
    '3) Use execution_card only when execution payload is complete and valid.',
    '4) Keep confidence between 0 and 1.',
    '5) Normalize common aliases: arbitro->arbitrum, usd coin->USDC, aave market->aave_v3.',
    '6) Scope is mainnet only. Unsupported requests must become clarify or error blocks.',
    '',
    'Examples:',
    'Input: "swap my USDC on optimism to USDT on arbitro for 50"',
    'Output intent_type: swap, execution.kind: swap, from_chain: optimism, to_chain: arbitrum, token_in: USDC, token_out: USDT, amount: "50"',
    '',
    'Input: "bridge 100 usdc to base"',
    'Output intent_type: bridge, execution.kind: bridge',
    '',
    'Input: "transfer 10 usdc to arbitrum"',
    'Output intent_type: clarify with missing_fields including recipient',
    '',
    'Input: "deposit my usdc on aave market on base 20"',
    'Output intent_type: deposit_supply, execution.protocol: aave_v3, token: USDC, chain: base',
    '',
    'Input: "withdraw 5 usdc from aave on arbitrum"',
    'Output intent_type: deposit_withdraw, execution.protocol: aave_v3, token: USDC, chain: arbitrum',
  ].join('\n')
}

export const AGENT_ALLOWED_ACTIONS = ALLOWED_ACTIONS
export const AGENT_FORBIDDEN_ACTIONS = FORBIDDEN_ACTIONS
