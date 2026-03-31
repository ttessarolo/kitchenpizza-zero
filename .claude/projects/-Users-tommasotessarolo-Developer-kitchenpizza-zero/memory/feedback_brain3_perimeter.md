---
name: brain3_llm_perimeter
description: Brain 3 LLM must be perimetered — science always dominates, LLM refines within parametric bounds tied to model capability. Perimeter must be configurable per-model in admin UI.
type: feedback
---

Brain 3 LLM ha un perimetro parametrico sul potere di influenza rispetto alla scienza deterministica.

**Why:** Un modello tiny (0.8B) non fine-tuned ha conoscenza limitata e rischio allucinazioni. La scienza COMANDA sempre. L'LLM può solo raffinare entro limiti configurabili. Il perimetro cambierà quando si useranno modelli più potenti o fine-tuned sulla knowledge base.

**How to apply:**
- Se la scienza dà severity massima (error) e LLM dice "dismissed" → la scienza vince. Loggare l'incongruenza server-side per review umana.
- Il perimetro è un set di parametri numerici (es. `maxSeverityOverride`, `canDismiss`, `confidenceThreshold`) legati al modello in uso.
- I parametri vanno in local_data (poi DB) e sono editabili via Admin/AI Brain UI.
- Nel prompt: istruire l'LLM a NON rispondere su argomenti che non conosce.
- Il perimetro deve essere facilmente allargabile quando si usa un modello più capace.
