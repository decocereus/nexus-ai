import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const PlanActionInputSchema = z.object({
  userText: z.string().min(1),
  context: z
    .object({
      walletConnected: z.boolean().optional(),
      network: z.string().optional(),
      account: z.string().optional(),
    })
    .optional(),
})

export const planAction = createServerFn({ method: 'POST' })
  .inputValidator(PlanActionInputSchema)
  .handler(async ({ data }) => {
    const { runPlanAction } = await import('./planAction.server')
    return runPlanAction(data)
  })
