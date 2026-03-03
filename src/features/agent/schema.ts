import { z } from 'zod'

export const IntentTypeSchema = z.enum([
  'swap',
  'bridge',
  'transfer',
  'deposit_supply',
  'deposit_withdraw',
  'clarify',
])

export const MissingFieldSchema = z.enum([
  'amount',
  'token',
  'from_chain',
  'to_chain',
  'recipient',
  'protocol_action',
])

export const SwapExecutionSchema = z
  .object({
    kind: z.literal('swap'),
    token_in: z.string().min(1),
    token_out: z.string().min(1),
    from_chain: z.string().min(1),
    to_chain: z.string().min(1),
    amount: z.string().min(1),
  })
  .strict()

export const BridgeExecutionSchema = z
  .object({
    kind: z.literal('bridge'),
    token: z.string().min(1),
    to_chain: z.string().min(1),
    amount: z.string().min(1),
    recipient: z.string().optional(),
  })
  .strict()

export const TransferExecutionSchema = z
  .object({
    kind: z.literal('transfer'),
    token: z.string().min(1),
    to_chain: z.string().min(1),
    amount: z.string().min(1),
    recipient: z.string().min(1),
  })
  .strict()

export const DepositSupplyExecutionSchema = z
  .object({
    kind: z.literal('deposit_supply'),
    protocol: z.literal('aave_v3'),
    token: z.literal('USDC'),
    chain: z.enum(['base', 'arbitrum']),
    amount: z.string().min(1),
  })
  .strict()

export const DepositWithdrawExecutionSchema = z
  .object({
    kind: z.literal('deposit_withdraw'),
    protocol: z.literal('aave_v3'),
    token: z.literal('USDC'),
    chain: z.enum(['base', 'arbitrum']),
    amount: z.string().min(1),
  })
  .strict()

export const ExecutionPayloadSchema = z.discriminatedUnion('kind', [
  SwapExecutionSchema,
  BridgeExecutionSchema,
  TransferExecutionSchema,
  DepositSupplyExecutionSchema,
  DepositWithdrawExecutionSchema,
])

export const IntentSummaryBlockSchema = z
  .object({
    type: z.literal('intent_summary'),
    title: z.string().min(1),
    lines: z.array(z.string().min(1)).min(1),
  })
  .strict()

export const MissingInfoBlockSchema = z
  .object({
    type: z.literal('missing_info'),
    fields: z.array(z.string().min(1)).min(1),
    prompt: z.string().min(1),
  })
  .strict()

export const WalletConnectRequestBlockSchema = z
  .object({
    type: z.literal('wallet_connect_request'),
    reason: z.string().min(1),
  })
  .strict()

export const ExecutionCardBlockSchema = z
  .object({
    type: z.literal('execution_card'),
    flow_kind: z.enum([
      'swap',
      'bridge',
      'transfer',
      'deposit_supply',
      'deposit_withdraw',
    ]),
    execution_ref: z.string().min(1),
  })
  .strict()

export const RiskNoticeBlockSchema = z
  .object({
    type: z.literal('risk_notice'),
    level: z.enum(['info', 'warning']),
    text: z.string().min(1),
  })
  .strict()

export const TxProgressBlockSchema = z
  .object({
    type: z.literal('tx_progress'),
    step_labels: z.array(z.string().min(1)).min(1),
  })
  .strict()

export const TxResultBlockSchema = z
  .object({
    type: z.literal('tx_result'),
    status: z.enum(['success', 'failed']),
    explorer_urls: z.array(z.string().url()).optional(),
  })
  .strict()

export const ErrorBlockSchema = z
  .object({
    type: z.literal('error'),
    message: z.string().min(1),
    code: z.string().optional(),
  })
  .strict()

export const UIBlockSchema = z.discriminatedUnion('type', [
  IntentSummaryBlockSchema,
  MissingInfoBlockSchema,
  WalletConnectRequestBlockSchema,
  ExecutionCardBlockSchema,
  RiskNoticeBlockSchema,
  TxProgressBlockSchema,
  TxResultBlockSchema,
  ErrorBlockSchema,
])

export const AgentPlanV1Schema = z
  .object({
    version: z.literal('1.0'),
    intent_id: z.string().min(1),
    intent_type: IntentTypeSchema,
    confidence: z.number().min(0).max(1),
    requires_wallet: z.boolean(),
    missing_fields: z.array(MissingFieldSchema),
    execution: ExecutionPayloadSchema.nullable(),
    ui_blocks: z.array(UIBlockSchema).min(1),
    assistant_text: z.string().min(1),
  })
  .strict()

export type IntentType = z.infer<typeof IntentTypeSchema>
export type MissingField = z.infer<typeof MissingFieldSchema>
export type ExecutionPayload = z.infer<typeof ExecutionPayloadSchema>
export type UIBlock = z.infer<typeof UIBlockSchema>
export type AgentPlanV1 = z.infer<typeof AgentPlanV1Schema>
