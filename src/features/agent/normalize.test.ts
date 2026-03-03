import { describe, expect, it } from 'vitest'
import {
  normalizeExecutionPayload,
  normalizeUserInput,
  normalizeChainName,
  normalizeTokenSymbol,
  normalizeProtocolName,
} from './normalize'

describe('normalizeUserInput', () => {
  it('normalizes chain/token/protocol aliases', () => {
    const result = normalizeUserInput(
      'swap my usd coin on optimism to usdt on arbitro then aave market',
    )

    expect(result.normalized.toLowerCase()).toContain('arbitrum')
    expect(result.normalized).toContain('USDC')
    expect(result.normalized).toContain('aave_v3')
  })

  it('normalizes individual aliases', () => {
    expect(normalizeChainName('Arbitro')).toBe('arbitrum')
    expect(normalizeTokenSymbol('usd coin')).toBe('USDC')
    expect(normalizeProtocolName('aave market')).toBe('aave_v3')
  })

  it('normalizes execution payload values', () => {
    const payload = normalizeExecutionPayload({
      kind: 'swap',
      token_in: 'usd coin',
      token_out: 'usdt',
      from_chain: 'optimism',
      to_chain: 'arbitro',
      amount: '50',
    })

    expect(payload).toEqual({
      kind: 'swap',
      token_in: 'USDC',
      token_out: 'USDT',
      from_chain: 'optimism',
      to_chain: 'arbitrum',
      amount: '50',
    })
  })
})
