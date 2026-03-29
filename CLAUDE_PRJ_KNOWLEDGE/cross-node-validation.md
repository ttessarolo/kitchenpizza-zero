# Cross-Node Scientific Validation — MANDATORY

**Every node type in the recipe graph MUST have cross-node scientific validation.** This is not optional. The graph reconciler validates individual nodes AND their coherence with upstream/downstream nodes. When adding a new node type, you MUST implement cross-node rules.

### The FermentationCoherenceManager Pattern

The `FermentationCoherenceManager` (`commons/utils/fermentation-coherence-manager.ts`) established the pattern for cross-node validation:

1. **Equivalent metric**: convert heterogeneous phases to a comparable scale (e.g., equivalent room-temperature hours for rise phases with different methods)
2. **Graph-level rules**: validate the aggregate of all related nodes, not just individual ones
3. **Portioning coherence**: detect when portioning settings (doughHours, yeastPct) diverge from actual graph state
4. **Sequence validation**: check node ordering constraints (e.g., fridge→bake needs acclimatization)
5. **Visual feedback**: assign `sourceNodeId` on warnings so affected nodes turn red in the graph

### Checklist for Adding a New Node Type

When creating a new `NodeTypeKey`, you MUST complete ALL of these:

- [ ] **Upstream constraints**: what upstream node types are required? What data must they provide?
- [ ] **Downstream constraints**: what does this node demand from downstream nodes?
- [ ] **Sequence rules**: is the node position in the graph constrained? (e.g., must follow X, cannot follow Y)
- [ ] **Parameter coherence**: do this node's parameters depend on or conflict with other nodes' parameters?
- [ ] **Science JSON rules**: create rule blocks in `/science/rules/` with `_meta.section` matching the domain
- [ ] **i18n keys**: add messageKey, action labels to `commons/i18n/{en,it}/science.json`
- [ ] **Manager function**: add validation function to existing or new `*-manager.ts` (pure function, ScienceProvider first param)
- [ ] **Reconciler integration**: wire validation into `graph-reconciler.service.ts` (appropriate phase)
- [ ] **Tests**: test all cross-node rules in `tests/` with synthetic graphs
- [ ] **sourceNodeId**: assign to warnings targeting specific nodes for red highlighting
- [ ] **UI filter**: ensure warning category appears in `DoughCompositionPanel.tsx` filter list

### Cross-Node Constraints by Node Type

| Node Type | Upstream Constraints | Downstream Constraints |
|-----------|---------------------|----------------------|
| **pre_dough** (autolisi) | None | Flour/water must be subset of dough node; duration vs W |
| **pre_ferment** | None | Flour/water subtracted from dough; pH check; maturation state |
| **dough** | Pre-ferment/autolisi flour+water balance | FDT determines all downstream fermentation speed |
| **rest** | Duration proportional to W; puntata = 30-70% of total room-temp time | Must precede formatura |
| **rise** | **FermentationCoherenceManager**: equiv hours, W capacity, yeast% match, acclimatization | Must reach target volume before bake |
| **shape** | Requires relaxed dough (post-rest/rise); weight per piece from portioning | Determines geometry affecting bake time |
| **pre_bake** | Sequence constraints (boil→bake, no oil before flour dust) | Must immediately precede bake |
| **bake** | Temp/time from composition (W, hydration, thickness, sugar%) | Internal temp target |
| **post_bake** | Cooling time before cut/wrap | Conservation constraints |
| **split** | Percentages must sum to 100%; min weight per piece | Each branch independent |
| **join** | Hydration compatibility (<15% diff); maturation compatibility | Combined params = weighted average |
| **prep** | Depends on applicationTiming (pre_bake, post_bake) | Temperature/method compatibility with bake |
| **done** | Terminal node | None |

### Equivalent Room-Temperature Hours Model

Rise phases at different temperatures are compared using **equivalent room-temperature hours**:

```
equivalentRoomHours = Σ(baseDur_i / 60 / tf_i)
```

Where `tf` is the rise method's time factor: room=1, fridge=3.6, ctrl18=1.4, ctrl12=2.2.

This allows coherence checking across phases: e.g., 1h room + 18h fridge + 1.5h room = 1 + 5 + 1.5 = **7.5h equivalent**.
