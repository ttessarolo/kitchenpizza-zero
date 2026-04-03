export interface LlmPromptEntry {
  key: string
  labelKey: string
  descriptionKey: string
  category: 'explanation' | 'constraint' | 'compatibility' | 'verification'
  template: string
  variables: string[]
  defaultModel?: string
  lastModified: string
}

// Default templates — used as reset targets in admin panel
const DEFAULT_TEMPLATES: Record<string, string> = {
  explain_warning: `You are a culinary science expert specializing in baking, fermentation, and dough rheology.
Explain the following recipe warning in practical, educational terms.

Warning key: {{messageKey}}
Context: {{context}}
Recipe summary: {{recipeSummary}}
Locale: {{locale}}

Provide a clear explanation (3-5 sentences) covering:
1. Why this warning was triggered
2. The science behind it
3. What the user should do to address it

Respond in the language specified by the locale.`,

  nl_to_constraints: `You are a recipe adaptation assistant with deep knowledge of baking science.
Extract structured constraints from the user's natural language request.

User request: "{{userInput}}"
Current recipe: {{recipeSummary}}
Available flours: {{availableFlours}}
Available ovens: {{availableOvens}}

Extract constraints as JSON with these optional fields:
{
  "targetHydration": number | null,
  "targetDoughHours": number | null,
  "flourTypes": string[] | null,
  "ovenType": string | null,
  "maxTemp": number | null,
  "deadline": string | null,
  "servings": number | null,
  "preferredMethod": string | null,
  "notes": string | null
}

Return ONLY the JSON object. Use null for fields not mentioned by the user.`,

  cross_layer_compat: `You are a culinary science expert. Assess the compatibility of combining these two recipe layers.

Layer 1: {{layer1Summary}}
Layer 2: {{layer2Summary}}

Evaluate compatibility considering:
- Temperature and timing conflicts
- Ingredient interactions
- Technique compatibility
- Flavor and texture harmony

Respond as JSON:
{
  "compatible": boolean,
  "score": number (0-100),
  "reasoning": "detailed explanation of compatibility assessment",
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2"]
}`,

  verify_reconciliation: `You are a culinary science verification system with deep expertise in baking chemistry, fermentation kinetics, and dough rheology. ALL text in llmReason and explanation fields MUST be written in {{locale}}. Never use English if locale is not ENGLISH.

CONTEXT: Each warning below includes the actual warning text, the computed values (Data), and available corrective actions. Use the Text and Data fields to make your decision — they contain the exact values the science engine used.

RULES:
- You can ONLY choose from actions already listed under each warning
- Keep llmReason to 2-3 sentences in {{locale}}. Reference specific values from the Data field.
- For each warning, you MUST provide a verdict. Do not skip warnings.
- Use "confirmed" when the science engine is correct given the data
- Use "downgraded" when the warning is technically valid but the situation is acceptable (e.g., a small deviation within practical tolerance)
- Use "upgraded" when the situation is worse than the warning severity suggests
- Use "dismissed" only when the warning is clearly wrong given the data
- If you are NOT SURE, respond with "confirmed" (trust the science engine)
- Do NOT say you lack information — all relevant data is provided in each warning's Data field and in the recipe summary below

Recipe:
{{recipeSummary}}

Type: {{recipeType}}/{{recipeSubtype}}
Global values: hyd={{hydration}}%, yeast={{yeastPct}}%, salt={{saltPct}}%, W={{flourW}}, doughHours={{doughHours}}

Process phases:
{{nodeDetails}}

Flour blend:
{{flourBlendInfo}}

Warnings to verify:
{{warningsSummary}}

Respond as JSON:
{"verifiedWarnings":[{"warningId":"id","llmVerdict":"confirmed|downgraded|upgraded|dismissed","llmReason":"reason in {{locale}} referencing specific values","suggestedAction":0}],"additionalInsights":[{"category":"string","severity":"info|warning","explanation":"in {{locale}}"}],"autoActions":[{"warningId":"id","actionIndex":0,"confidence":0.9}]}`,
}

export const LLM_PROMPTS: LlmPromptEntry[] = [
  {
    key: 'explain_warning',
    labelKey: 'admin.ai.prompt.explain_warning',
    descriptionKey: 'admin.ai.prompt.explain_warning_desc',
    category: 'explanation',
    template: DEFAULT_TEMPLATES.explain_warning,
    variables: ['messageKey', 'context', 'recipeSummary', 'locale'],
    lastModified: '2026-04-03',
  },
  {
    key: 'nl_to_constraints',
    labelKey: 'admin.ai.prompt.nl_to_constraints',
    descriptionKey: 'admin.ai.prompt.nl_to_constraints_desc',
    category: 'constraint',
    template: DEFAULT_TEMPLATES.nl_to_constraints,
    variables: ['userInput', 'recipeSummary', 'availableFlours', 'availableOvens'],
    lastModified: '2026-04-03',
  },
  {
    key: 'cross_layer_compat',
    labelKey: 'admin.ai.prompt.cross_layer_compat',
    descriptionKey: 'admin.ai.prompt.cross_layer_compat_desc',
    category: 'compatibility',
    template: DEFAULT_TEMPLATES.cross_layer_compat,
    variables: ['layer1Summary', 'layer2Summary'],
    lastModified: '2026-04-03',
  },
  {
    key: 'verify_reconciliation',
    labelKey: 'admin.ai.prompt.verify_reconciliation',
    descriptionKey: 'admin.ai.prompt.verify_reconciliation_desc',
    category: 'verification',
    template: DEFAULT_TEMPLATES.verify_reconciliation,
    variables: ['recipeSummary', 'recipeType', 'recipeSubtype', 'hydration', 'yeastPct', 'saltPct', 'flourW', 'doughHours', 'nodeDetails', 'flourBlendInfo', 'warningsSummary', 'locale'],
    lastModified: '2026-04-03',
  },
]

export { DEFAULT_TEMPLATES }
