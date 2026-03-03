import type { UIBlock } from './schema'

export const UI_BLOCK_CATALOG = {
  intent_summary: {
    description: 'Summarize parsed intent in plain language.',
    requiredFields: ['title', 'lines'],
  },
  missing_info: {
    description: 'Request only fields needed to continue safely.',
    requiredFields: ['fields', 'prompt'],
  },
  wallet_connect_request: {
    description: 'Prompt for wallet connection confirmation in chat.',
    requiredFields: ['reason'],
  },
  execution_card: {
    description: 'Render deterministic flow card bound to execution payload.',
    requiredFields: ['flow_kind', 'execution_ref'],
  },
  risk_notice: {
    description: 'Show contextual risk disclosures before execution.',
    requiredFields: ['level', 'text'],
  },
  tx_progress: {
    description: 'Display transaction progress steps.',
    requiredFields: ['step_labels'],
  },
  tx_result: {
    description: 'Render success/failure outcome summary.',
    requiredFields: ['status'],
  },
  error: {
    description: 'Display safe, user-facing errors.',
    requiredFields: ['message'],
  },
} as const

export type CatalogBlockType = keyof typeof UI_BLOCK_CATALOG

export const ALLOWED_UI_BLOCK_TYPES = Object.keys(
  UI_BLOCK_CATALOG,
) as CatalogBlockType[]

export function isAllowedUIBlockType(type: string): type is CatalogBlockType {
  return ALLOWED_UI_BLOCK_TYPES.includes(type as CatalogBlockType)
}

export function getRequiredFieldsForBlock(type: CatalogBlockType): string[] {
  return [...UI_BLOCK_CATALOG[type].requiredFields]
}

export function getUIBlockType(block: UIBlock): CatalogBlockType {
  return block.type
}
