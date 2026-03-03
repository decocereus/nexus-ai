import {
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
  type ExecuteParams,
} from '@avail-project/nexus-core'
import DepositModal from './components/deposit-modal'
import { type Address } from 'viem'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useNexus } from '../../providers/NexusProvider'
import SimpleDeposit from './components/simple-deposit'

export interface BaseDepositProps {
  address: Address
  token?: SUPPORTED_TOKENS
  chain: SUPPORTED_CHAINS_IDS
  showHistory?: boolean
  onPreview?: (payload: unknown) => void
  onStateChange?: (state: { status: string; step?: string }) => void
  onStart?: () => void
  onComplete?: (explorerUrl?: string) => void
  onError?: (error: { code?: string; message: string; raw?: unknown }) => void
  chainOptions?: {
    id: number
    name: string
    logo: string
  }[]
  depositExecute: (
    token: SUPPORTED_TOKENS,
    amount: string,
    chainId: SUPPORTED_CHAINS_IDS,
    userAddress: `0x${string}`,
  ) => Omit<ExecuteParams, 'toChainId'>
}

interface NexusDepositProps extends BaseDepositProps {
  heading?: string
  embed?: boolean
  embedded?: boolean
  destinationLabel?: string
}

const NexusDeposit = ({
  address,
  token = 'USDC',
  chain,
  chainOptions, // pass to customise sources displayed, if not provided, all sources will be shown
  heading = 'Deposit USDC',
  embed = false,
  embedded,
  destinationLabel,
  depositExecute,
  showHistory = true,
  onPreview,
  onStateChange,
  onStart,
  onComplete,
  onError,
}: NexusDepositProps) => {
  const resolvedEmbed = embedded ?? embed
  const { supportedChainsAndTokens } = useNexus()
  const formatedChainOptions =
    chainOptions ??
    supportedChainsAndTokens?.map((chain) => {
      return {
        id: chain.id,
        name: chain.name,
        logo: chain.logo,
      }
    })
  if (resolvedEmbed) {
    return (
      <Card>
        <CardHeader className="px-3">
          <CardTitle>{heading}</CardTitle>
        </CardHeader>
        <CardContent className="px-3">
          <SimpleDeposit
            address={address}
            token={token}
            chain={chain}
            chainOptions={formatedChainOptions}
            destinationLabel={destinationLabel}
            depositExecute={depositExecute}
            showHistory={showHistory}
            onPreview={onPreview}
            onStateChange={onStateChange}
            onStart={onStart}
            onComplete={onComplete}
            onError={onError}
          />
        </CardContent>
      </Card>
    )
  }
  return (
    <DepositModal
      address={address}
      token={token}
      chain={chain}
      chainOptions={formatedChainOptions}
      heading={heading}
      destinationLabel={destinationLabel}
      depositExecute={depositExecute}
      showHistory={showHistory}
      onPreview={onPreview}
      onStateChange={onStateChange}
      onStart={onStart}
      onComplete={onComplete}
      onError={onError}
    />
  )
}

export default NexusDeposit
