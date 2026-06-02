# Scoring

Quality score for a scope, 0 (worst) to 1 (best).

> **Why this file was rewritten (anti-dilution).** The old model divided every
> penalty by the *whole scope* line count. In a large scope that normalizes real,
> concentrated problems to near-zero: a run with ~20 genuine findings over ~1900
> lines scored **0.99 "clean"** even though one file (and a triplicated function)
> were clearly rotten. Fix: score **per file** as well as scope-wide, and let the
> **worst file** and **hotspots** drive the band — a scope is only "clean" if its
> worst meaningful file is also clean.

## How the score is computed

Compute penalties BOTH per-file and scope-wide.

### Per-category penalty, per file `f`
```
penalty_cat(f) = Σ(severity_weight · count_in_f) / file_size(f)
file_size(f)   = non-blank, non-comment lines in f
```
Categories: `structural`, `ai_gambiarra`, `coupling` (severity weights below).

### File penalty & file score
```
file_penalty(f) = 0.25·structural(f) + 0.45·ai_gambiarra(f)
                + 0.30·coupling(f)  + 1.00·dead_ratio(f)
file_score(f)   = 1 − clamp(file_penalty(f), 0, 1)
```

### Scope score — the headline number (weighted average by lines)
```
scope_score = 1 − clamp( Σ_f penalty_numerator(f) / Σ_f file_size(f), 0, 1)
```
This equals the old single number. Report it, but it is **not** what picks the band.

### Worst-file score — the anti-dilution signal
```
worst_file_score = min, over files with ≥ 40 non-blank lines, of file_score(f)
```
The 40-line guard stops a tiny file with one finding from dominating the result.

### Dead code (by lines, not symbols — see `dead-code.md`)
```
dead_ratio(f)     = dead_lines(f) / file_size(f)          # per file
dead_ratio(scope) = Σ dead_lines / scope_size             # scope-wide
dead_lines = non-blank, non-comment lines of grep-confirmed dead symbols
             (unreachable / unused-callable / dead types), counted once, no overlap
```
The dead term carries weight `1.00` — as heavy as all other categories combined —
because a per-symbol count drastically under-weights dead code. To avoid
double-counting, the per-symbol **dead code (unused export)** finding is **excluded**
from `ai_gambiarra` whenever its lines are already counted in `dead_lines`.

## Reporting & band selection

**Always report three things:**
1. `scope_score` — the headline (weighted average).
2. `worst_file_score` — and the file that produced it.
3. **Hotspots** — every file with `file_penalty ≥ 0.20` OR `≥ 6 findings`, listed
   with its `file_score` and top findings.

**The band is decided by `min(scope_score, worst_file_score)` — never by
`scope_score` alone.** A scope can only be called "clean" if its worst meaningful
file is also clean. Refactor effort targets hotspots first; they carry the risk
even when the average looks fine.

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
> `dead_ratio` and excluded here to avoid double-counting. See `dead-code.md` § Scoring.

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

The band is read off `min(scope_score, worst_file_score)`:

| Score range | Meaning |
|-------------|---------|
| 0.85–1.00   | clean — usually skip refactor |
| 0.70–0.85   | minor issues — fix opportunistically |
| 0.50–0.70   | spaghetti — refactor recommended |
| 0.30–0.50   | heavy spaghetti — refactor strongly recommended |
| 0.00–0.30   | critical — refactor before adding any feature |

## Band floors & gate overrides

Three situations override the numeric bands so concentrated rot can't read as clean:

- **Dead-code floor.** If `dead_ratio(scope) > 0.30`, clamp the band to at most
  **"spaghetti — refactor recommended"** regardless of the number.
- **Density floor (anti-dilution).** If `worst_file_score < 0.50` for any file with
  ≥ 40 non-blank lines, clamp the band to at most **"spaghetti — refactor
  recommended"** and **name the hotspot file**, regardless of `scope_score`.
- **Gate override.** Skip the "score ≥ 0.75 → default no" proceed-gate whenever a
  hotspot exists OR a grep-confirmed dead-code finding exists. The concentration /
  confirmation is a stronger signal than the diluted average; surface it and let
  the user decide.

## Worked example (the run that motivated this rewrite)

Scope: oppy-content "seletor + ativação" — 12 files, ~1900 lines, ~20 findings,
including `CompanySelectorView.tsx` (large file + mixed concerns) and a
`runScopeAction` triplicated across 3 hooks.

- Old model: `scope_score ≈ 0.99` → band "clean" → skill defaults to *skip*. **Wrong.**
- New model: `scope_score` still ~0.99, BUT `CompanySelectorView.tsx` has a high
  `file_penalty` (large class + mixed concerns) → `worst_file_score` lands in the
  spaghetti range → **band = min(0.99, worst) → "spaghetti"**, density floor names
  the hotspot, gate override fires. The triplicated `runScopeAction` shows up as a
  hotspot via near-duplicate findings concentrated in those files. **Correct.**

## Overrides

User may override any severity per session by passing `--severity <finding>=<level>`.
The skill must record overrides in the final report.
