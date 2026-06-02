# Blast Radius

Before refactoring a file, you need to know **who depends on it** — including
dependents *outside* the scope. A change that looks local often isn't. This is the
single biggest cause of cross-team / multi-agent breakage: an agent edits a file
seeing only its own context, blind to the consumers it breaks.

`scripts/blast-radius.mjs` answers "what breaks if I touch this?" with three signals.

## Run it

```
node scripts/blast-radius.mjs <file> --root <repo-root>
# or, once published:
npx @mdices/eat-spaghetti-blast-radius <file> --root <repo-root>
# JSON for tooling/CI:
node scripts/blast-radius.mjs <file> --json
```

Options: `--root <dir>` (default cwd), `--alias @/=src/` (default; repeatable),
`--json`. No external deps (Node ≥ 18): filesystem scan + git + regex. **Read-only.**

## The three signals

1. **Fan-in (importers).** Every source file that imports the target, resolved
   across relative paths and the `@/` alias. High fan-in = high blast radius.
2. **Cross-feature (feature→feature).** Importers that live in a *different feature*
   than the target, where neither is `shared`/`ui`. `shared → feature` is normal and
   is NOT flagged; only `feature → feature` is — that's the coupling that should go
   through a shared module instead. Flagged with `⚠`.
3. **Co-change.** Files that historically changed in the same commits as the target
   (`git log`). Surfaces coupling the import graph can't see — e.g., a frontend file,
   a locale, and an edge function that always move together.

## How the skill uses it (Phase 0)

- Run on each confirmed seed. Importers found *outside* the candidate list are
  pulled into consideration (the change reaches them).
- **Risk gate into Phase 2:** a seed with high fan-in or any `⚠` cross-feature
  dependent MUST get characterization tests before any Phase 3 edit. The bigger the
  blast radius, the stronger the net required first.

## How CI / other agents use it

The same script is the guardrail's "Fase 0" mapper and a generic primitive:
- CI can run it on PR-changed files and comment the affected dependents.
- Codex / Antigravity invoke the same `npx` command — one implementation, many
  entry points (no per-agent duplication).

## Limits

- Static + syntactic: misses dynamic `import(variable)` and string-keyed lookups.
- Bare/`node_modules` specifiers are ignored (only first-party files).
- Co-change is capped at the last 40 commits touching the target (perf).
- The feature/zone heuristic is path-based (`src/components/<feature>`, `src/pages`,
  and `hooks|services|lib|contexts|integrations|utils|types|schemas|locales` →
  `shared`, `components/ui` → `ui`). Adjust if the repo layout differs.
