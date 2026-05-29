# Scoring

Quality score for a scope, 0 (worst) to 1 (best).

## Formula

```
score = 1 - clamp(
    0.25 * structural_penalty
  + 0.45 * ai_gambiarra_penalty
  + 0.30 * coupling_penalty,
  0, 1)
```

Each penalty:
```
penalty_category = sum(severity_weight * count) / scope_size
scope_size = total non-blank, non-comment lines across all files in scope
```

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

## Overrides

User may override any severity per session by passing `--severity <finding>=<level>`. The skill must record overrides in the final report.
