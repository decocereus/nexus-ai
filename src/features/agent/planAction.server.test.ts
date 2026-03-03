import { beforeEach, describe, expect, it } from 'vitest'
import { runPlanAction } from './planAction.server'

describe('runPlanAction (heuristic fallback)', () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OPENROUTER_MODEL
    delete process.env.OPENROUTER_BASE_URL
    delete process.env.OPENROUTER_HTTP_REFERER
    delete process.env.OPENROUTER_APP_TITLE
  })

  it('parses swap with arbitro alias to arbitrum', async () => {
    const plan = await runPlanAction({
      userText: 'swap my USDC on optimism to USDT on arbitro for 50',
      context: { walletConnected: false, network: 'mainnet' },
    })

    expect(plan.intent_type).toBe('swap')
    expect(plan.execution?.kind).toBe('swap')
    if (plan.execution?.kind === 'swap') {
      expect(plan.execution.to_chain).toBe('arbitrum')
      expect(plan.execution.token_in).toBe('USDC')
      expect(plan.execution.token_out).toBe('USDT')
    }
  })

  it('returns clarify with missing recipient for transfer request', async () => {
    const plan = await runPlanAction({
      userText: 'transfer 10 usdc to arbitrum',
      context: { walletConnected: false, network: 'mainnet' },
    })

    expect(plan.intent_type).toBe('clarify')
    expect(plan.missing_fields).toContain('recipient')
    expect(plan.execution).toBeNull()
  })

  it('returns clarify for unsupported intent', async () => {
    const plan = await runPlanAction({
      userText: 'stake 2 eth on lido',
      context: { walletConnected: false, network: 'mainnet' },
    })

    expect(plan.intent_type).toBe('clarify')
    expect(plan.missing_fields).toContain('protocol_action')
  })
})
