import { describe, expect, it } from 'vitest'
import { AgentPlanV1Schema } from './schema'

describe('AgentPlanV1Schema', () => {
  it('accepts a valid plan', () => {
    const parsed = AgentPlanV1Schema.safeParse({
      version: '1.0',
      intent_id: 'test-id',
      intent_type: 'swap',
      confidence: 0.8,
      requires_wallet: true,
      missing_fields: [],
      execution: {
        kind: 'swap',
        token_in: 'USDC',
        token_out: 'USDT',
        from_chain: 'optimism',
        to_chain: 'arbitrum',
        amount: '10',
      },
      ui_blocks: [
        {
          type: 'intent_summary',
          title: 'Summary',
          lines: ['Swap 10 USDC to USDT'],
        },
      ],
      assistant_text: 'Ready.',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects unknown block type', () => {
    const parsed = AgentPlanV1Schema.safeParse({
      version: '1.0',
      intent_id: 'test-id',
      intent_type: 'clarify',
      confidence: 0.2,
      requires_wallet: false,
      missing_fields: ['amount'],
      execution: null,
      ui_blocks: [
        {
          type: 'totally_unknown_block',
          title: 'x',
        },
      ],
      assistant_text: 'Need more info.',
    })

    expect(parsed.success).toBe(false)
  })
})
