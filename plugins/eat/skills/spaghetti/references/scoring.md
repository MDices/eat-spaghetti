# Scoring

Quality score for a scope, 0 (worst) to 1 (best).

## Formula

```
score = 1 - clamp(
    0.25 * structural_penalty
  + 0.45 * ai_gambiarra_penalty
  + 0.30 * coupling_penalty
  + 1.00 * dead_ratio,
  0, 1)
```

Each per-symbol penalty:
```
penalty_category = sum(severity_weight * count) / scope_size
scope_size = total non-blank, non-comment lines across all files in scope
```

Dead code is scored by **lines, not symbols** (see `dead-code.md`):
```
dead_ratio = dead_lines / scope_size
dead_lines = non-blank, non-comment lines belonging to grep-confirmed dead
             symbols in scope (unreachable / unused-callable / dead types),
             counted once with no overlap
```

The dead term carries weight `1.00` — as heavy as all other categories combined
— because a per-symbol count drastically under-weights dead code (a 200-line dead
cluster is only ~10–20 findings). With this term a file that is 60% dead scores
≈ 0.40 instead of ≈ 0.97. To avoid double-counting, the per-symbol **dead code
(unused export)** finding below is **excluded** from `ai_gambiarra_penalty`
whenever its lines are already counted in `dead_lines`.

## Severity Weights

| Severity | Weight |
|----------|-------:|
| low      | 0.1    |
| medium   | 0.3    |
| high     | 0.7    |
| critical | 1.0    |

## Default Severities by Finding

### Structural (from `code-smells.md`)
| Finding                    | Severity |
|----------------------------|----------|
| long function (>50 lines)  | medium   |
| long function (>100 lines) | high     |
| long parameter list (>4)   | medium   |
| deep nesting (>3 levels)   | medium   |
| large class (>300 lines)   | high     |
| duplicated code (5+ lines) | high     |
| primitive obsession        | low      |
| data clumps                | low      |
| feature envy               | medium   |

### AI Gambiarra (from `ai-gambiarras.md`)
| Finding                       | Severity |
|-------------------------------|----------|
| empty/swallow catch           | critical |
| `any`/`as any` (TS)           | high     |
| TODO/FIXME/HACK/XXX comment   | medium   |
| dead code (unused export)     | medium   |
| commented-out code            | low      |
| boolean flag parameter        | medium   |
| near-duplicate block          | high     |
| useEffect deps wrong/empty    | high     |
| generic identifier            | low      |
| reimplemented stdlib/lib util | medium   |
| stray console.log/print       | low      |
| single-impl interface         | low      |

> **Dead code is scored by lines, not by this per-symbol table.** The `dead code
> (unused export)` row stays for reference, but its lines are counted via
> `dead_ratio` in the formula above and excluded here to avoid double-counting.
> See `dead-code.md` § Scoring.

### Coupling (from `coupling-signals.md`)
| Finding                       | Severity |
|-------------------------------|----------|
| shallow module                | medium   |
| pass-through method           | low      |
| circular import               | critical |
| global state mutation         | high     |
| props drilling >3 levels      | medium   |
| mixed concerns in single file | high     |

## Interpretation

| Score range | Meaning |
|-------------|---------|
| 0.85–1.00   | clean — usually skip refactor |
| 0.70–0.85   | minor issues — fix opportunistically |
| 0.50–0.70   | spaghetti — refactor recommended |
| 0.30–0.50   | heavy spaghetti — refactor strongly recommended |
| 0.00–0.30   | critical — refactor before adding any feature |

## Dead-code band floor & gate override

The numeric score can still read high when dead code is concentrated in a few
large symbols. Two rules override the bands above:

- **Band floor.** If `dead_ratio > 0.30`, the reported band is clamped to at
  most **"spaghetti — refactor recommended"** regardless of the numeric score.
  Report the number, but force the label down and recommend a refactor.
- **Gate override.** Skip the "score ≥ 0.75 → default no" proceed-gate whenever a
  grep-confirmed dead-code finding exists. The confirmation is a stronger signal
  than the normalized number; surface it and let the user decide.

## Overrides

User may override any severity per session by passing `--severity <finding>=<level>`. The skill must record overrides in the final report.
