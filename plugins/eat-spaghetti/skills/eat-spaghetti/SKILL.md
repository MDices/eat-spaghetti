---
name: eat-spaghetti
description: Use when code quality is degrading, when refactoring tangled/spaghetti code, when removing AI-generated gambiarras, or when a module needs cleanup without breaking dependents. Provides scoped analysis with quality score, generates characterization tests before changes, and refactors in safe micro-steps verified by loop-test between each step. Two modes — reactive (user invokes on a module) and proactive (post-edit hook with cheap circuit-breaker before deep analysis).
---

# eat-spaghetti

End-to-end workflow for analyzing and cleaning spaghetti code without breaking dependents. Two modes, one pipeline.

## Hard Rules

1. Never refactor whole-codebase. Scope is always a single module/feature.
2. Never change observable behavior during refactoring. Suspect bugs are reported, not fixed.
3. Never invent new abstractions. Only apply refactorings from `references/refactorings.md`.
4. Never skip Phase 2 (characterization tests) without warning the user.
5. Run loop-test between every Phase 3 micro-step.
6. Never use `--no-verify`, `--force`, or any flag that bypasses project guards.

## Modes

- **Reactive** — user invokes ("audita o carrinho", `/eat-spaghetti <scope>`).
- **Proactive** — `hooks/post-edit-check.ps1` runs after `Edit`/`Write` and invokes the skill only on real signals. In proactive mode the skill runs Phases 0–1 only and stops at the report. The user decides whether to run Phases 2–4.

## Pipeline

### Phase 0 — Scope Discovery

**Reactive:**
1. Take the user's description.
2. `Grep` and `Glob` for related terms (component names, route paths, store keys).
3. Show the candidate list to the user. Confirm before expanding.
4. From confirmed seeds, expand the dependency tree via grep on imports and call sites until no new files appear.
5. Hard cap: 30 files. If exceeded, ask the user to narrow.

**Proactive:**
1. Scope = edited file(s) + 1-level imports/importers only.

### Phase 1 — Analysis & Score

1. Read `references/scoring.md`.
2. Read `references/code-smells.md`, `references/ai-gambiarras.md`, `references/coupling-signals.md`.
3. For every file in scope, apply each detection heuristic. Collect findings: file, line, category, severity, suggested refactoring.
4. Compute the score per `scoring.md`.
5. Output to the user:
   - Score (0–1) with band label.
   - Top findings sorted by severity then category.
   - If score ≥ 0.75: ask whether to proceed at all. Default: no.
6. **Stop here in proactive mode.** Save a brief report and exit.

### Phase 2 — Characterization Tests

1. Read `references/characterization-tests.md`.
2. For each unit to be refactored: detect framework, find seams, generate tests locking the current behavior.
3. Run the new tests. All must pass before Phase 3.
4. If any abort condition holds (no framework / no seam / non-deterministic with no stub point), **abort** the pipeline and tell the user what would unblock it.
5. Commit characterization tests: `test(eat-spaghetti): characterization for <unit>`.

### Phase 3 — Micro-step Refactoring

1. Read `references/refactorings.md`.
2. For each approved finding, look up the recommended refactoring.
3. Apply ONE refactoring at a time, following its Mechanics exactly.
4. After each step, invoke `loop-test` on the **filtered suite**: tests that directly or transitively import a touched file.
   - Pass → commit: `refactor(eat-spaghetti): <refactoring> in <file>`. Continue.
   - Fail → revert the step (`git checkout -- <files>` or equivalent). Mark the finding as blocked. Continue with the next finding.
5. Stop conditions: all findings handled, OR step limit (default 15) hit, OR user interrupted.

### Phase 4 — Final Validation

1. Run the full project test suite + lint + type-check.
2. Re-run Phase 1 analysis. Compute new score.
3. Write the final report to `.eat-spaghetti/reports/YYYY-MM-DD-HHMM-<scope>.md`:
   - Scope, all findings, applied refactorings, blocked findings (with reasons), score before/after.
4. If `.eat-spaghetti/` is not in `.gitignore`, suggest adding it.

## Guardrails

- **Score already good** (≥0.75): show minor findings, ask whether to continue. Default no.
- **No testable seam**: abort before Phase 3.
- **Scope > 30 files**: ask to narrow.
- **Step limit reached**: stop, commit, ask whether to continue.
- **Behavior-changing transformation needed**: NEVER apply silently. Add to findings as "possible bug — out of refactor scope".
- **No abstractions invented**: catalog only.
- **No bypass flags**: hooks run normally.

## Configuration

Per-session env vars:
- `EAT_SPAGHETTI_OFF=1` — disable proactive hook.
- `EAT_SPAGHETTI_MAX_STEPS=N` — override step limit (default 15).
- `EAT_SPAGHETTI_MAX_SCOPE=N` — override file cap (default 30).

## Hook Installation

To enable the proactive mode, install `hooks/post-edit-check.ps1` via the `update-config` skill. See `hooks/post-edit-check.md` for the exact configuration entry.

## What this skill does NOT do

- It is not a bug-finder. Suspect bugs are reported as findings, never silently fixed.
- It is not an architect. Abstractions and new modules are out of scope.
- It is not a full code review. Use `superpowers:requesting-code-review` for that.
- It does not modify external repos or shared infra.
