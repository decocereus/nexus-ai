import type { ExecuteParams } from '@avail-project/nexus-core'
import { encodeFunctionData, parseUnits, type Address } from 'viem'
import {
  AAVE_ALLOWED_TOKEN,
  AAVE_V3_CONFIG,
  isAaveSupportedChain,
  type AaveSupportedChainKey,
} from './config'

type AaveBuildInput = {
  chain: AaveSupportedChainKey
  token: 'USDC'
  amount: string
  account: Address
}

const AAVE_SUPPLY_ABI = [
  {
    type: 'function',
    name: 'supply',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' },
    ],
    outputs: [],
  },
] as const

const AAVE_WITHDRAW_ABI = [
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'to', type: 'address' },
    ],
    outputs: [{ name: 'withdrawn', type: 'uint256' }],
  },
] as const

function assertValidInput(input: {
  chain: string
  token: string
  amount: string
  account?: string
}): asserts input is {
  chain: AaveSupportedChainKey
  token: 'USDC'
  amount: string
  account: Address
} {
  if (!isAaveSupportedChain(input.chain)) {
    throw new Error(`Unsupported Aave chain: ${input.chain}`)
  }
  if (input.token !== AAVE_ALLOWED_TOKEN) {
    throw new Error(`Unsupported Aave token: ${input.token}`)
  }
  if (!input.amount || Number(input.amount) <= 0) {
    throw new Error('Amount must be greater than 0')
  }
  if (!input.account) {
    throw new Error('Missing account address')
  }
}

export function buildSupplyExecute(input: AaveBuildInput): ExecuteParams {
  assertValidInput(input)
  const config = AAVE_V3_CONFIG[input.chain]
  const amount = parseUnits(input.amount, 6)

  return {
    toChainId: config.chainId,
    to: config.poolAddress,
    data: encodeFunctionData({
      abi: AAVE_SUPPLY_ABI,
      functionName: 'supply',
      args: [config.usdcAddress, amount, input.account, 0],
    }),
    gas: 450000n,
    tokenApproval: {
      token: config.usdcAddress,
      amount,
      spender: config.poolAddress,
    },
  }
}

export function buildWithdrawExecute(input: AaveBuildInput): ExecuteParams {
  assertValidInput(input)
  const config = AAVE_V3_CONFIG[input.chain]
  const amount = parseUnits(input.amount, 6)

  return {
    toChainId: config.chainId,
    to: config.poolAddress,
    data: encodeFunctionData({
      abi: AAVE_WITHDRAW_ABI,
      functionName: 'withdraw',
      args: [config.usdcAddress, amount, input.account],
    }),
    gas: 350000n,
  }
}

export function buildSupplyDepositExecute(input: {
  chain: AaveSupportedChainKey
  account: Address
}) {
  const config = AAVE_V3_CONFIG[input.chain]

  return (
    _tokenSymbol: string,
    tokenAddress: `0x${string}`,
    amount: bigint,
  ): Omit<ExecuteParams, 'toChainId'> => ({
    to: config.poolAddress,
    data: encodeFunctionData({
      abi: AAVE_SUPPLY_ABI,
      functionName: 'supply',
      args: [tokenAddress, amount, input.account, 0],
    }),
    gas: 450000n,
    tokenApproval: {
      token: tokenAddress,
      amount,
      spender: config.poolAddress,
    },
  })
}
