# KitchenPizza — Roadmap & Architectural Vision

> Document: living reference for the project evolution.
> Last updated: 2026-03-30
> Status: Conceptual + first architectural decisions taken.

---

## Vision

KitchenPizza è una piattaforma per la composizione scientifica di ricette. L'utente non "scrive" una ricetta — la **compone** come un grafo di processi interconnessi, validato da scienza deterministica, adattabile alle sue esigenze, e spiegabile in linguaggio naturale.

Il sistema ha tre classi di utenti:
1. **Professionisti/studiosi** (desktop) — usano il graph editor per comporre, analizzare, perfezionare ricette a livello scientifico
2. **Utenti curiosi** (desktop) — esplorano il graph editor per capire la scienza dietro le ricette
3. **Utenti consumer** (mobile) — interagiscono via AI: scelgono ricette, le adattano, cucinano

---

## Architettura: i 4 Cervelli

### Brain 1 — Grafo Ricetta (Graphology)

**Cosa è:** il substrato strutturale. Un DAG (Directed Acyclic Graph) in memoria sul server che modella la ricetta come rete di processi. Ogni nodo è un'azione (impasto, lievitazione, cottura, etc.), ogni arco porta parametri di scheduling e flusso ingredienti.

**Scelta tecnologica:** Graphology.js — libreria TypeScript matura (5+ anni, backend di sigma.js), directed/undirected/mixed graphs, attributi tipizzati su nodi e archi, sistema di eventi, 25+ pacchetti algoritmi (traversal, topological sort, shortest path, connected components, centrality).

**Perché Graphology e non Grafeo (Cypher):** Grafeo è un graph database completo con Cypher nativo (la scelta ideale a regime), ma è troppo giovane (~460 stars, 1 anno di vita) per essere una dependency core. Graphology è puro JS (zero rischi di deploy su Netlify), maturo, e copre i nostri use case strutturali. Grafeo resta nel radar per una futura rivalutazione quando sarà più stabile.

**Perché un DSL custom e non Cypher:** il nostro tiny LLM (0.6-1.7B parametri) genera JSON strutturato con alta affidabilità, ma non genera Cypher sintatticamente corretto. Un DSL JSON domain-specific è: più facile da generare per un piccolo modello, più type-safe, e più comprensibile per non-programmatori. Quando/se migreremo a Grafeo, il DSL diventerà un layer di astrazione sopra Cypher.

**Stato attuale (Marzo 2026):** il grafo è rappresentato come array piatti (`nodes[]` + `edges[]`), con traversal manuali nel reconciler e nei manager. La migrazione a Graphology aggiunge query espressive, subgraph extraction per il layer mixing, e una base solida per il constraint solver.

---

### Brain 2 — Scienza Deterministica (JSON/DB)

**Cosa è:** il ground truth scientifico. Formule, regole, soglie, classificazioni, cataloghi — tutto codificato in file dichiarativi (JSON oggi, tabelle DB domani). I manager TypeScript sono puri orchestratori che leggono la scienza e la applicano al grafo. Zero logica scientifica nel codice.

**Struttura:**
- **FormulaBlock** — espressioni matematiche (Formula L per il lievito, Q10 per la temperatura)
- **FactorChainBlock** — catene moltiplicative (durata cottura = base × fattore materiale × fattore modalità × fattore spessore)
- **PiecewiseBlock** — funzioni a scalini (classificazione forza farina per W)
- **RuleBlock** — regole condizionali con azioni/mutazioni (warning con correzioni suggerite)
- **CatalogBlock** — tabelle di lookup (farine, metodi di lievitazione, profili cottura)
- **DefaultsBlock** — valori predefiniti per tipo/sottotipo ricetta
- **ClassificationBlock** — categorizzazione di valori continui

**Stato attuale:** ~75% della scienza è esternalizzata (34 file JSON). Il restante ~25% è hardcoded nei manager (calcolo temperatura impasto, fattori di temperatura per lievitazione, durate cottura per metodo, validazione range cottura). La migrazione completa porterà a 0% hardcoded.

**Evoluzione futura:** i file JSON migreranno in tabelle Neon PostgreSQL per editing via UI, versionamento, rollback, e accesso distribuito. L'interfaccia `ScienceProvider` astrae già il backend — il codice non cambierà.

---

### Brain 3 — OpenAI gpt-5.4-mini (Cloud API)

**Cosa è:** il modello LLM cloud (OpenAI gpt-5.4-mini) che funge da "bridge intelligente" tra l'utente e il sistema deterministico. Usa l'SDK ufficiale OpenAI con supporto nativo per structured JSON output.

**Ruoli:**
1. **NL → Constraints:** l'utente dice "ho farina Manitoba, forno elettrico 250°C, pronto domani alle 19" → il modello genera un JSON strutturato di vincoli che il sistema deterministico applica
2. **Spiegazioni:** traduce i warning tecnici in linguaggio comprensibile ("Con W280, 18h di lievitazione in frigo sono ottimali perché...")
3. **Compatibilità cross-layer:** valuta se due layer di ricette diverse sono compatibili e suggerisce adattamenti
4. **Generazione query DSL:** traduce richieste naturali in query sul grafo ("trova tutte le lievitazioni in frigo senza acclimatazione")
5. **Coaching:** guida l'utente nella composizione/correzione della ricetta

**Modello:** OpenAI gpt-5.4-mini via API cloud. Eccellente per structured JSON output, multilingua (italiano nativo), ragionamento scientifico. Perimetro operativo molto più ampio rispetto ai modelli tiny precedenti (Qwen 0.8B).

**Principio fondamentale:** il LLM è un oracolo fallibile. NON è mai l'unica fonte di verità. Ogni output che diventa una mutazione del grafo passa attraverso la validazione deterministica di Brain 2. Se il LLM suggerisce un'idratazione assurda, il rule engine la blocca.

**Deployment:** chiamate API dirette, nessun model loading locale. Latenza tipica 1-3s. Feature flag `LLM_ENABLED` per disabilitare completamente. Graceful degradation: se il LLM non è disponibile, il sistema funziona normalmente senza spiegazioni e senza adattamento NL.

**Evoluzione futura:** con la potenza di gpt-5.4-mini, diventa praticabile la generazione diretta di query Cypher per il grafo, coaching avanzato context-aware, e analisi cross-ricetta.

---

### Brain 4 — Cooking Science Brain (Knowledge Backbone)

**Cosa è:** un sistema separato (progetto autonomo) che accumula conoscenza culinaria scientifica da migliaia di fonti (libri, articoli, video trascritti, siti web). Struttura la conoscenza in un knowledge graph (Neo4j) con ricerca semantica (Qdrant, embeddings qwen3-embedding:8b a 2048 dimensioni). Espone 18 tool via MCP server.

**Principio fondamentale:** "La conoscenza è nei processi, non nelle ricette." Una ricetta è un grafo di link a tecniche, procedure, abbinamenti — non conoscenza autonoma.

**Schema del grafo:**
- Primo livello (conoscenza fondamentale): Technique, Procedure, Pairing, Tool, Parameter, Ingredient, Concept
- Secondo livello (composizioni): Recipe, Claim
- Dimensione trasversale: Location (gerarchico: continente → nazione → regione → città)

**Come alimenta KitchenPizza:**
- **Oggi (offline):** Claude Code interroga CSB via MCP → genera/affina le regole JSON, formule, cataloghi → commit nel repo KP → deploy
- **Domani (online):** CSB in cloud, il tiny LLM di KP chiama CSB MCP per arricchire risposte con conoscenza viva
- **Futuro:** dataset di fine-tuning per il tiny LLM generato dalle coppie (query, risultato strutturato) del CSB

**Stato attuale:** sistema funzionante in locale. Pipeline 8 fasi (OCR → verifica → classificazione → strutturazione → estrazione entità → skill). Neo4j + Qdrant in Docker. UI TanStack Start. S3 come source of truth.

---

## Roadmap per Fasi

### Milestone 1: Server-Side Multi-Brain Engine (IN CORSO)

**Branch:** `feat/multi-brain-engine`
**Timeline stimato:** 15-19 giorni

| Fase | Cosa | Stato |
|------|------|-------|
| Brain 1 — Graphology engine | RecipeGraphEngine, DSL, reconciler v2 | Da implementare |
| Client→Server migration | Eliminazione staticProvider, tutte le computazioni via oRPC | Da implementare |
| Science externalization | Migrazione del 25% hardcoded rimanente a JSON | Da implementare |
| Brain 3 — Tiny LLM base | Qwen3-0.6B senza fine-tuning, spiegazioni e NL→constraints | Da implementare |
| Test suite | Unit, integration, regression, parity, e2e | Da implementare |
| Deploy Netlify | Feature flags, gradual rollout | Da implementare |

**Dettaglio implementativo:** vedi `CLAUDE_PRJ_KNOWLEDGE/graph-engine-evolution.md`

---

### Milestone 2: Backward Scheduling & User Adaptation

**Prerequisiti:** Milestone 1 completato

**Obiettivo:** l'utente fornisce vincoli temporali e di disponibilità, il sistema adatta automaticamente la ricetta.

| Feature | Descrizione |
|---------|-------------|
| User timetable | Modello dati per disponibilità utente (giorni, orari, slot non disponibili) |
| Backward scheduler | Dato un deadline ("pronto domani alle 19"), calcola start time e distribuisce le fasi |
| Gear profile | Modello dati per l'attrezzatura dell'utente (tipo forno, temperatura max, farine disponibili, lieviti) |
| Constraint solver | Dato gear + timetable + ricetta, adatta parametri (idratazione, lievito, metodo lievitazione, tempo cottura) |
| UX desktop | Pannello "Adatta ricetta" con input gear/timetable e visualizzazione risultato |
| UX mobile | Flusso conversazionale: "Voglio fare questa pizza domani sera, ho farina 00 e forno elettrico" |

**Architettura:** il backward scheduler opera sul Graphology graph (Brain 1), usando traversal inversi dal nodo terminale. Il constraint solver applica le regole scientifiche (Brain 2) per validare e adattare. Il tiny LLM (Brain 3) traduce l'input naturale in vincoli strutturati e genera la spiegazione degli adattamenti.

---

### Milestone 3: Cross-Layer Mixing & Recipe Library

**Prerequisiti:** Milestone 1 completato

**Obiettivo:** l'utente può combinare layer di ricette diverse dalla library del sistema.

| Feature | Descrizione |
|---------|-------------|
| Recipe library | Catalogo di ricette pubbliche con layer separati (impasto, topping, prep, etc.) |
| Layer extraction | Estrarre un layer da una ricetta come subgraph indipendente |
| Layer mixing | Combinare layer da ricette diverse in una nuova ricetta |
| Compatibility check | Validazione automatica della compatibilità tra layer (scienza + LLM) |
| Cross-layer edges | Gestione delle dipendenze tra layer (ingredienti condivisi, vincoli temporali) |
| Auto-adaptation | Dopo il mix, adattamento automatico dei parametri per coerenza |

**Architettura:** `RecipeGraphEngine.extractLayer()` e `mergeLayer()` (Brain 1). Regole di compatibilità in JSON (Brain 2). Assessment LLM per casi ambigui (Brain 3). Conoscenza sui Pairing dal CSB (Brain 4).

---

### Milestone 4: CSB Online & LLM Fine-Tuning

**Prerequisiti:** CSB sufficientemente popolato, Milestones 1-2 completati

**Obiettivo:** portare il CSB in produzione e fine-tunare il tiny LLM.

| Feature | Descrizione |
|---------|-------------|
| CSB cloud deploy | Neo4j + Qdrant in cloud, API pubblica, MCP server accessibile dal server KP |
| LLM accesso a CSB | Il tiny LLM chiama CSB MCP per arricchire risposte con conoscenza strutturata |
| Dataset generation | Pipeline automatica: query CSB → generazione coppie (input, output) per fine-tuning |
| Fine-tuning GRPO | Addestramento Qwen3-0.6B/1.7B con GRPO per structured output nel dominio culinario |
| A/B testing | Confronto base model vs fine-tuned su metriche di qualità |
| Model update pipeline | Processo per aggiornare il modello in produzione senza downtime |

**Tasks fine-tuning:**
1. NL → Constraints JSON (dalla knowledge base CSB)
2. Warning → Spiegazione (dai warning rules + context ricetta)
3. Query DSL generation (dalle query reali degli utenti)
4. Compatibilità cross-layer (dai Pairing del CSB)
5. Recipe coaching (dalle Technique e Procedure del CSB)

---

### Milestone 5: Mobile AI Experience

**Prerequisiti:** Milestones 1-3 completati, LLM funzionante

**Obiettivo:** l'app mobile diventa un'interfaccia conversazionale dove l'utente interagisce via AI per comporre, adattare, e cucinare.

| Feature | Descrizione |
|---------|-------------|
| Chat interface | Interfaccia conversazionale su React Native (Expo) |
| Recipe browser | Catalogo ricette con filtri e ricerca semantica |
| AI adaptation flow | "Voglio cucinare X con i miei strumenti" → adattamento automatico |
| Cooking mode | Guida passo-passo durante la preparazione, con timer e notifiche |
| Voice input | Input vocale per hands-free durante la preparazione |
| Offline mode | Cache ricette adattate per uso senza connessione |

**Architettura:** il mobile è un thin client. Tutto passa dal server via oRPC. L'AI conversazionale è il tiny LLM (Brain 3) arricchito dal CSB (Brain 4). Il graph editor NON è disponibile su mobile — solo visualizzazione semplificata della ricetta come lista di step.

---

### Milestone 6: Science Evolution Platform

**Prerequisiti:** Milestone 4 completato

**Obiettivo:** la scienza diventa una piattaforma editabile, versionabile, collaborativa.

| Feature | Descrizione |
|---------|-------------|
| Science editor UI | Editor web per formule, regole, cataloghi, con preview real-time |
| Versioning | Ogni modifica alla scienza è versionata (git-like) con rollback |
| A/B science | Possibilità di testare varianti di regole su subset di utenti |
| AI science generation | Claude Code + CSB propongono nuove regole, l'esperto valida |
| Community contributions | Gli esperti possono proporre modifiche alla scienza (peer review) |
| Multi-domain | Estensione oltre panificazione: pasticceria, fermentazione, cucina molecolare |

---

## Decisioni Architetturali Aperte

Queste decisioni verranno prese quando le condizioni saranno più chiare:

| Decisione | Opzioni | Quando decidere |
|-----------|---------|-----------------|
| Grafeo vs Graphology | Migrare a Grafeo per Cypher nativo se matura | Milestone 3, quando i pattern DSL superano 50+ |
| LLM size | 0.6B vs 1.7B vs 3B | Dopo benchmark Milestone 1, prima del fine-tuning |
| Netlify vs dedicated server per LLM | Serverless vs always-on Node.js | Dopo deploy Milestone 1, basato su cold start reali |
| Science in DB vs JSON | PostgreSQL tables vs JSON files | Milestone 6, quando l'editing collaborativo lo richiede |
| CSB online deployment | AWS vs GCP vs managed Neo4j+Qdrant | Milestone 4, basato su costi e performance |
| Fine-tuning framework | GRPO vs DPO vs SFT | Milestone 4, basato sulla qualità del dataset |
| Mobile framework | Expo only vs Expo + web mobile | Milestone 5, basato su adoption patterns |

---

## Principi Immutabili

Questi principi NON cambiano indipendentemente dall'evoluzione tecnologica:

1. **La scienza è esterna al codice.** Se un valore scientifico è nel TypeScript, è un bug.
2. **Il server è il cervello.** Il client è un renderer. Nessuna computazione scientifica nel browser.
3. **Il determinismo è il ground truth.** L'LLM suggerisce, la scienza decide. Mai il contrario.
4. **Ogni numero conta.** 70% di idratazione non è 70.1%. La precisione è sacra.
5. **La conoscenza è nei processi.** Una ricetta è un grafo di tecniche, non una lista di ingredienti.
6. **i18n ovunque.** Nessuna stringa visibile hardcoded. Mai. In nessuna lingua.
