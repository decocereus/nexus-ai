import {
  SUPPORTED_CHAINS,
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
} from '@avail-project/nexus-core'

const CHAIN_NAME_TO_ID: Record<string, SUPPORTED_CHAINS_IDS> = {
  ethereum: SUPPORTED_CHAINS.ETHEREUM,
  optimism: SUPPORTED_CHAINS.OPTIMISM,
  arbitrum: SUPPORTED_CHAINS.ARBITRUM,
  base: SUPPORTED_CHAINS.BASE,
  polygon: SUPPORTED_CHAINS.POLYGON,
  avalanche: SUPPORTED_CHAINS.AVALANCHE,
  bsc: SUPPORTED_CHAINS.BNB,
  scroll: SUPPORTED_CHAINS.SCROLL,
}

const SUPPORTED_TOKENS_LIST = [
  'USDC',
  'USDT',
  'DAI',
  'ETH',
  'WETH',
  'WBTC',
  'USDM',
] as const

export function toSupportedChainId(
  chainName: string,
): SUPPORTED_CHAINS_IDS | null {
  return CHAIN_NAME_TO_ID[chainName.toLowerCase()] ?? null
}

export function toSupportedToken(token: string): SUPPORTED_TOKENS | null {
  const normalized = token.toUpperCase()
  if (!SUPPORTED_TOKENS_LIST.includes(normalized as (typeof SUPPORTED_TOKENS_LIST)[number])) {
    return null
  }
  return normalized as SUPPORTED_TOKENS
}
