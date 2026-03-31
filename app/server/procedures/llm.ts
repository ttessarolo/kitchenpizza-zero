import { baseProcedure } from '../middleware/auth'
import {
  explainWarningInputSchema,
  explainWarningOutputSchema,
  nlToConstraintsInputSchema,
  nlToConstraintsOutputSchema,
  checkCompatInputSchema,
  checkCompatOutputSchema,
} from '../schemas/llm'
import { llmService } from '../services/llm/llm-service'
import { getPromptTemplate, fillTemplate } from '../services/llm/prompt-store'

export const explainWarning = baseProcedure
  .input(explainWarningInputSchema)
  .output(explainWarningOutputSchema)
  .handler(async ({ input }) => {
    const template = getPromptTemplate('explain_warning')
    if (!template) return { explanation: null, source: 'fallback' as const }

    const prompt = fillTemplate(template, {
      messageKey: input.messageKey,
      context: JSON.stringify(input.messageVars ?? {}),
      locale: input.locale,
    })

    const explanation = await llmService.generate(prompt)
    return {
      explanation,
      source: explanation ? ('llm' as const) : ('fallback' as const),
    }
  })

export const nlToConstraints = baseProcedure
  .input(nlToConstraintsInputSchema)
  .output(nlToConstraintsOutputSchema)
  .handler(async ({ input }) => {
    const template = getPromptTemplate('nl_to_constraints')
    if (!template) return { constraints: null, source: 'fallback' as const }

    const prompt = fillTemplate(template, {
      userInput: input.userInput,
      recipeSummary: input.recipeSummary ?? 'No recipe loaded',
    })

    const constraints = await llmService.generateJSON(
      prompt,
      nlToConstraintsOutputSchema.shape.constraints.unwrap(),
    )
    return {
      constraints,
      source: constraints ? ('llm' as const) : ('fallback' as const),
    }
  })

export const checkCompat = baseProcedure
  .input(checkCompatInputSchema)
  .output(checkCompatOutputSchema)
  .handler(async ({ input }) => {
    const template = getPromptTemplate('cross_layer_compat')
    if (!template) return { result: null, source: 'fallback' as const }

    const prompt = fillTemplate(template, {
      layer1Summary: input.layer1Summary,
      layer2Summary: input.layer2Summary,
    })

    const result = await llmService.generateJSON(
      prompt,
      checkCompatOutputSchema.shape.result.unwrap(),
    )
    return {
      result,
      source: result ? ('llm' as const) : ('fallback' as const),
    }
  })
