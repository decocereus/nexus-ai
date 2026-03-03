import type { ExecutionPayload } from './schema'

const CHAIN_ALIAS_MAP: Record<string, string> = {
  arbitro: 'arbitrum',
  arb: 'arbitrum',
  arbtrum: 'arbitrum',
  arbi: 'arbitrum',
  op: 'optimism',
  optimistic: 'optimism',
  'eth mainnet': 'ethereum',
}

const TOKEN_ALIAS_MAP: Record<string, string> = {
  'usd coin': 'USDC',
  'usdc.e': 'USDC',
  tether: 'USDT',
  'usd tether': 'USDT',
  'wrapped ether': 'WETH',
  'wrapped bitcoin': 'WBTC',
}

const PROTOCOL_ALIAS_MAP: Record<string, string> = {
  'aave market': 'aave_v3',
  aave: 'aave_v3',
}

const CANONICAL_CHAINS = new Set([
  'ethereum',
  'optimism',
  'arbitrum',
  'base',
  'polygon',
  'avalanche',
  'bsc',
  'scroll',
])

const CANONICAL_PROTOCOLS = new Set(['aave_v3'])

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applyAliasMap(
  input: string,
  aliases: Record<string, string>,
): { text: string; replacements: Array<{ from: string; to: string }> } {
  let next = input
  const replacements: Array<{ from: string; to: string }> = []

  for (const [from, to] of Object.entries(aliases)) {
    const regex = new RegExp(`\\b${escapeRegExp(from)}\\b`, 'gi')
    if (!regex.test(next)) continue
    next = next.replace(regex, to)
    replacements.push({ from, to })
  }

  return { text: next, replacements }
}

export type NormalizedUserInput = {
  raw: string
  normalized: string
  aliases: {
    chains: Array<{ from: string; to: string }>
    tokens: Array<{ from: string; to: string }>
    protocols: Array<{ from: string; to: string }>
  }
}

export function normalizeUserInput(rawInput: string): NormalizedUserInput {
  const trimmed = rawInput.trim()
  const chainResult = applyAliasMap(trimmed, CHAIN_ALIAS_MAP)
  const tokenResult = applyAliasMap(chainResult.text, TOKEN_ALIAS_MAP)
  const protocolResult = applyAliasMap(tokenResult.text, PROTOCOL_ALIAS_MAP)

  return {
    raw: rawInput,
    normalized: protocolResult.text,
    aliases: {
      chains: chainResult.replacements,
      tokens: tokenResult.replacements,
      protocols: protocolResult.replacements,
    },
  }
}

export function normalizeChainName(chain: string): string {
  const normalized = chain.trim().toLowerCase()
  return CHAIN_ALIAS_MAP[normalized] ?? normalized
}

export function normalizeTokenSymbol(token: string): string {
  const normalized = token.trim().toLowerCase()
  const alias = TOKEN_ALIAS_MAP[normalized]
  return (alias ?? token.trim()).toUpperCase()
}

export function normalizeProtocolName(protocol: string): string {
  const normalized = protocol.trim().toLowerCase()
  return PROTOCOL_ALIAS_MAP[normalized] ?? normalized
}

export function normalizeExecutionPayload(
  execution: ExecutionPayload,
): ExecutionPayload {
  switch (execution.kind) {
    case 'swap':
      return {
        ...execution,
        token_in: normalizeTokenSymbol(execution.token_in),
        token_out: normalizeTokenSymbol(execution.token_out),
        from_chain: normalizeChainName(execution.from_chain),
        to_chain: normalizeChainName(execution.to_chain),
      }
    case 'bridge':
      return {
        ...execution,
        token: normalizeTokenSymbol(execution.token),
        to_chain: normalizeChainName(execution.to_chain),
      }
    case 'transfer':
      return {
        ...execution,
        token: normalizeTokenSymbol(execution.token),
        to_chain: normalizeChainName(execution.to_chain),
      }
    case 'deposit_supply':
    case 'deposit_withdraw':
      return {
        ...execution,
        protocol: normalizeProtocolName(execution.protocol) as 'aave_v3',
        token: normalizeTokenSymbol(execution.token) as 'USDC',
        chain: normalizeChainName(execution.chain) as 'base' | 'arbitrum',
      }
    default:
      return execution
  }
}

export function isSupportedMainnetChain(chain: string): boolean {
  return CANONICAL_CHAINS.has(normalizeChainName(chain))
}

export function isSupportedProtocol(protocol: string): boolean {
  return CANONICAL_PROTOCOLS.has(normalizeProtocolName(protocol))
}
