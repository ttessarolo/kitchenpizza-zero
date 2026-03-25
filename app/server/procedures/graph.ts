import { baseProcedure } from '../middleware/auth'
import { reconcileInputSchema, reconcileOutputSchema } from '../schemas/graph'
import { reconcileGraph } from '../services/graph-reconciler.service'

export const reconcile = baseProcedure
  .input(reconcileInputSchema)
  .output(reconcileOutputSchema)
  .handler(async ({ input }) => {
    // The reconciler is a pure function — no DB/network needed
    return reconcileGraph(
      input.graph as any,
      input.portioning as any,
      input.meta,
    )
  })
