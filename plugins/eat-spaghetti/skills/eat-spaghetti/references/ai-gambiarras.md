# AI Gambiarras

Anti-patterns common in AI-generated code that classical refactoring books don't cover. Each entry: definition, detection regex/heuristic, why it's bad, remedy.

## empty/swallow catch

**Definition:** `catch` block that does nothing, or only logs and continues.
**Detect:**
- `catch\s*\(\s*\w*\s*\)\s*\{\s*\}` (empty)
- `catch\s*\([^)]*\)\s*\{\s*console\.(log|warn|error)\([^)]*\)\s*;?\s*\}` (log-only)
**Why bad:** hides failures, makes debugging impossible.
**Remedy:** rethrow, propagate, or handle explicitly. If truly recoverable, add a comment explaining why.

## `any` / `as any` (TypeScript)

**Definition:** Explicit escape from the type system.
**Detect:** `:\s*any\b`, `\bas\s+any\b`, `<any>` in generics.
**Why bad:** defeats the purpose of TypeScript; bugs slip through.
**Remedy:** infer correct type; use `unknown` + type guards if truly dynamic.

## TODO/FIXME/HACK/XXX comments

**Definition:** Self-confessed incomplete work.
**Detect:** `//\s*(TODO|FIXME|HACK|XXX|GAMBIARRA)\b`, `#\s*(TODO|FIXME|HACK|XXX)\b`.
**Why bad:** rots over time; nobody comes back.
**Remedy:** fix now or open an issue with concrete acceptance criteria.

## dead code / unused exports

**Definition:** Exported symbol with zero callers in scope; private symbol never used.
**Detect:** grep for symbol name; if 1 match (the definition), it's unused.
**Why bad:** increases cognitive load, lies about what the module provides.
**Remedy:** delete.

## commented-out code

**Definition:** Source code preserved as a comment.
**Detect:** comment lines that parse as valid syntax of the surrounding language.
**Why bad:** version control already keeps history; comments rot.
**Remedy:** delete.

## boolean flag parameter

**Definition:** A parameter named `is*`, `has*`, `should*`, `flag*`, or just `boolean` typed, that switches function behavior.
**Detect:** signature scan + branching on that param inside body.
**Why bad:** splits one function into two interleaved functions.
**Remedy:** Split into two named functions (Replace Parameter with Explicit Methods).

## near-duplicate block

**Definition:** Two blocks that differ only in literals or one identifier.
**Detect:** normalize literals to placeholders, compare blocks.
**Why bad:** bugs get fixed in one copy and not the other.
**Remedy:** Extract Function with the differing piece as a parameter.

## useEffect with wrong/empty deps

**Definition (React):** `useEffect(fn, [])` that captures props/state, or `useEffect(fn)` with no array, or array missing referenced identifiers.
**Detect:** parse the effect body, list referenced identifiers from the component closure, compare to deps array.
**Why bad:** stale closures, infinite renders, or hidden bugs.
**Remedy:** fix deps; or refactor into `useCallback`/`useMemo`/`useEvent`; consider lifting state.

## generic identifier name

**Definition:** Variable/function named `data`, `result`, `temp`, `helper`, `handleStuff`, `doIt`, `manager`, `info`, `value` (when not a generic library).
**Detect:** exact-name match list.
**Why bad:** forces the reader to read the implementation to learn the purpose.
**Remedy:** rename to express intent. If you can't name it, the abstraction is wrong.

## reimplemented stdlib/library utility

**Definition:** Hand-written code that duplicates a function already available in the standard library or an already-imported dependency (e.g., `lodash`, `date-fns`).
**Detect:** known utility patterns — `function chunk(`, `function debounce(`, manual deep clone, manual deep equal, hand-rolled date parser.
**Why bad:** more code to maintain, often buggier than the canonical.
**Remedy:** delete; use the existing utility.

## stray console.log / print

**Definition:** Debug output left in production code.
**Detect:** `console\.(log|debug|info)\(`, `print\(`, `println!\(`, `fmt\.Println\(` outside of CLI/main entry.
**Why bad:** noise; sometimes leaks data.
**Remedy:** delete, or replace with the project's logger if intentional.

## single-implementation interface / abstract class

**Definition:** An abstraction with exactly one concrete implementation/use.
**Detect:** find interface/abstract class declarations; count implementers in scope (including dep-expansion).
**Why bad:** abstraction without a second user is speculation.
**Remedy:** Inline the interface into its single implementation.

## defensive over-validation

**Definition:** Validating parameters that were already validated upstream, or guarding against impossible states.
**Detect:** runs of `if (x == null) throw ...`, `if (typeof x !== 'string') ...` at internal boundaries.
**Why bad:** noise; obscures the real logic.
**Remedy:** validate only at system boundaries (user input, external APIs). Trust internal callers.

## "fixed by AI" comments

**Definition:** Comments referring to the AI session, the prompt, or "Claude/GPT/Copilot" by name.
**Detect:** `(claude|gpt|copilot|chatgpt|ai assistant)` in comments (case-insensitive).
**Why bad:** leaks process; rots immediately.
**Remedy:** delete.
