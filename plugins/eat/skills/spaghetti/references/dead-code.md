# Dead Code

Code that is **valid but never used** — it parses/compiles fine, but no live
execution path depends on it. This is the smell `scoring.md` most under-weights
(see **Scoring** below): a file can be *majority* dead code and still land in
the "clean" band, because dead code surfaces as a *few* symbol-findings that
span *many* lines. Weigh it by lines, not by symbol count.

## Types

| Type | Definition | Example |
|---|---|---|
| **Unreachable** | No control-flow path reaches it. | statements after an unconditional `return`/`throw`; `if (false) { … }`. |
| **Unused (callable)** | Reachable in principle, but never called. | an exported function with zero importers; a private method never invoked. |
| **Redundant** | Executes, but its result is never observed. | a variable assigned and never read; a pure call whose return is discarded. |
| **Partially dead** | Live on some paths, dead on others. | a value computed before a branch but used in only one arm. |
| **Dead types** (typed langs) | A type/interface referenced nowhere — or only by other dead types. | a legacy manifest interface used only by other unused code. |

## Detection

Every tool reduces to one of two mechanisms:

- **Reachability analysis** — from known entry points (`main`, the public API, test entries, framework hooks), walk the call/import graph; anything not reached is dead. (Go's `deadcode` uses Rapid Type Analysis from `main`; bundlers call the inverse operation *tree-shaking*.)
- **Mark-and-sweep over the symbol/module graph** — mark every imported/referenced symbol, sweep the unmarked. (Knip, ts-prune.)

### Tools by language

| Lang | Tool | Finds |
|---|---|---|
| JS/TS | **Knip** (recommended) | unused files, exports, types, deps & devDeps — models the whole module graph. |
| JS/TS | `ts-prune` (maintenance mode), ESLint `no-unused-vars` / `no-unreachable`, `tsc --noUnusedLocals` | unused exports / locals / unreachable statements. |
| Python | **Vulture** | unused classes, functions, variables, imports (supports whitelists for false positives). |
| Go | `golang.org/x/tools/cmd/deadcode`, Staticcheck `U1000` | unreachable funcs (RTA call graph from `main`); unused unexported symbols. |
| Rust | `rustc` `dead_code` / `unused_*` (warn-by-default), Clippy | unused items, imports, fields. |
| any | **grep fallback** (this skill's default) | grep the symbol across the *dep-expanded* scope; if the only hit is the definition, it is unused. |

## Limits & false positives — confirm before deleting

Static analysis sees only **syntactic** use. It cannot see code kept alive by:

- **Reflection / dynamic dispatch / metaprogramming** — DI containers, serializers, ORMs.
- **Framework magic** — Django/Flask/FastAPI routes, pytest fixtures, decorators, Next.js file conventions. Reported false-positive rates reach ~70% on such frameworks.
- **Dynamic imports / string-keyed lookups** — `import(name)`, `obj[key]()`.
- **Public API for external consumers** — a library's exports are "unused" inside its own repo but are the product.
- **Entry points** — `main`, CLI commands, hook scripts, test-only helpers.

So before applying **Remove Dead Code**:

1. Confirm **zero callers across the dep-expanded scope** (not just the one file).
2. **Exclude** entry points, public-API surfaces, and reflection/DI targets — treat them as alive even with zero static callers.
3. Prefer a **language-aware tool** over grep when the language has reflection or framework magic. The grep fallback is safe only for self-contained modules with no dynamic dispatch.

## Why it's costly

Lies about what a module provides; inflates the surface a reader must hold in their head; bloats bundle size and build time; widens the attack surface; and rots — once unreferenced it is never updated and silently diverges from reality.

## Scoring (implemented in `scoring.md`)

A per-symbol `penalty = Σ(severity·count) / scope_size` under-weights dead code: a
200-line dead cluster is ~10–20 symbol-findings, which normalizes to a near-zero
penalty, so dead-code-heavy files would still score in the "clean" band and the
skill would default to *skip*. (Observed before the fix: a file that was ~60%
dead code scored ~0.97.) `scoring.md` now implements both of the following:

- **Weight by lines, not symbols.** `dead_ratio = dead_lines / scope_size` is its
  own penalty term, carrying weight `1.00`, so a file that is 60% dead scores
  ≈ 0.4, not 0.97. The per-symbol "dead code" finding is excluded from the AI
  gambiarra penalty whenever its lines are already counted in `dead_lines`, to
  avoid double-counting.
- **Band floor / gate override.** If `dead_ratio > 0.30`, the band is clamped to
  at most "spaghetti — refactor recommended" regardless of the numeric score, and
  the "score ≥ 0.75 → default no" gate is skipped whenever a grep-confirmed
  dead-code finding exists. The most valuable signal is the dead-code
  confirmation, not the normalized number.

## Remedy

**Remove Dead Code** (see `refactorings.md`): re-confirm zero callers in the
dep-expanded scope, delete the symbol, run the filtered suite. Low risk when the
scope is verified; trivially reversible via VCS. Never delete a public-API /
entry-point / reflection target on static evidence alone — downgrade it to a
reported finding instead.

## Sources

- [Unreachable code — Wikipedia](https://en.wikipedia.org/wiki/Unreachable_code)
- [Dead code — Devopedia](https://devopedia.org/dead-code)
- [Exposing dead code — vFunction](https://vfunction.com/blog/dead-code/)
- [Use knip to detect dead code and types — Effective TypeScript](https://effectivetypescript.com/2023/07/29/knip/)
- [Unused exports — Knip docs](https://knip.dev/typescript/unused-exports)
- [ts-prune](https://github.com/nadeesha/ts-prune)
- [deadcode command — golang.org/x/tools](https://pkg.go.dev/golang.org/x/tools/cmd/deadcode)
- [Staticcheck](https://staticcheck.dev/)
- [rustc warn-by-default lints (`dead_code`)](https://doc.rust-lang.org/rustc/lints/listing/warn-by-default.html)
- [Guide to Dead Code Identification and Removal — Penser](https://pensero.ai/blog/dead-code)
