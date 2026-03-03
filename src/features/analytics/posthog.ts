import posthog from 'posthog-js'
import type { IntentType } from '@/features/agent/schema'

export type AnalyticsEventName =
  | 'intent_parsed'
  | 'intent_clarification_requested'
  | 'wallet_connect_prompted'
  | 'wallet_connected'
  | 'nexus_initialized'
  | 'preview_rendered'
  | 'execute_clicked'
  | 'tx_started'
  | 'tx_succeeded'
  | 'tx_failed'
  | 'agent_schema_validation_failed'

export type AnalyticsDimensions = {
  intent_type?: IntentType
  source_chain?: string
  destination_chain?: string
  token?: string
  protocol?: string
  error_code?: string
  latency_ms?: number
}

let initialized = false

const RELIABILITY_ALERTS = {
  minSamples: 20,
  schemaValidationFailedRate: 0.15,
  txFailedRate: 0.2,
} as const

let totalIntents = 0
let totalSchemaValidationFailed = 0
let totalTxStarted = 0
let totalTxFailed = 0

export function initPosthog(): void {
  if (initialized || typeof window === 'undefined') return

  const apiKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined
  if (!apiKey) return

  posthog.init(apiKey, {
    api_host:
      (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
      'https://app.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
  })

  initialized = true
}

export function trackEvent(
  event: AnalyticsEventName,
  dimensions: AnalyticsDimensions = {},
): void {
  if (typeof window === 'undefined') return
  initPosthog()
  if (!initialized) return

  posthog.capture(event, dimensions)

  if (event === 'intent_parsed') {
    totalIntents += 1
  }
  if (event === 'agent_schema_validation_failed') {
    totalSchemaValidationFailed += 1
  }
  if (event === 'tx_started') {
    totalTxStarted += 1
  }
  if (event === 'tx_failed') {
    totalTxFailed += 1
  }

  const schemaFailedRate =
    totalIntents === 0 ? 0 : totalSchemaValidationFailed / totalIntents
  const txFailedRate = totalTxStarted === 0 ? 0 : totalTxFailed / totalTxStarted

  if (
    totalIntents >= RELIABILITY_ALERTS.minSamples &&
    schemaFailedRate >= RELIABILITY_ALERTS.schemaValidationFailedRate
  ) {
    console.warn('High schema validation failure rate detected', {
      schemaFailedRate,
      totalIntents,
      totalSchemaValidationFailed,
    })
  }

  if (
    totalTxStarted >= RELIABILITY_ALERTS.minSamples &&
    txFailedRate >= RELIABILITY_ALERTS.txFailedRate
  ) {
    console.warn('High transaction failure rate detected', {
      txFailedRate,
      totalTxStarted,
      totalTxFailed,
    })
  }
}
