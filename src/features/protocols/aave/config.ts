import { SUPPORTED_CHAINS } from '@avail-project/nexus-core'
import type { Address } from 'viem'

export type AaveSupportedChainKey = 'base' | 'arbitrum'
export const AAVE_SUPPORTED_CHAINS: AaveSupportedChainKey[] = [
  'base',
  'arbitrum',
]

export const AAVE_ALLOWED_TOKEN = 'USDC' as const

export const AAVE_V3_CONFIG = {
  base: {
    chainId: SUPPORTED_CHAINS.BASE,
    poolAddress: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' as Address,
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
  },
  arbitrum: {
    chainId: SUPPORTED_CHAINS.ARBITRUM,
    poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD' as Address,
    usdcAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8' as Address,
  },
} as const

export function isAaveSupportedChain(
  chain: string,
): chain is AaveSupportedChainKey {
  return AAVE_SUPPORTED_CHAINS.includes(chain as AaveSupportedChainKey)
}
