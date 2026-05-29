# Structural Code Smells

Behavior-agnostic structural problems. Each entry has: definition, detection heuristic, default severity (see `scoring.md`), suggested refactoring(s) (see `refactorings.md`).

## long function

**Definition:** Function body exceeds 50 lines (medium) or 100 lines (high).
**Detect:** count non-blank, non-comment lines between function declaration and matching closer.
**Refactorings:** Extract Function, Decompose Conditional, Replace Temp with Query.

## long parameter list

**Definition:** Function/method takes >4 parameters.
**Detect:** parse signature.
**Refactorings:** Introduce Parameter Object, Preserve Whole Object, Replace Parameter with Query.

## deep nesting

**Definition:** Indentation depth >3 inside a function body.
**Detect:** track max brace/indent depth.
**Refactorings:** Replace Nested Conditional with Guard Clauses, Extract Function, Decompose Conditional.

## large class

**Definition:** Class/file >300 source lines, OR >10 public methods.
**Detect:** line count + method count regex.
**Refactorings:** Extract Class, Split Phase, Move Function.

## duplicated code

**Definition:** Same 5+ consecutive lines appear ≥2 times in scope (exact or near-exact ignoring whitespace).
**Detect:** sliding-window hash comparison.
**Refactorings:** Extract Function, Pull Up Method (if in sibling classes), Consolidate Duplicate Code.

## primitive obsession

**Definition:** Repeated use of raw primitives (string IDs, money as number, dates as string) where a small type would clarify intent.
**Detect:** look for >3 parameters/fields of same primitive type with the same prefix/suffix.
**Refactorings:** Replace Primitive with Object.

## data clumps

**Definition:** The same group of 3+ parameters/fields appears together in multiple places.
**Detect:** signature similarity scan.
**Refactorings:** Introduce Parameter Object, Extract Class.

## feature envy

**Definition:** A method uses more features of another class than its own.
**Detect:** count member-access references inside method body; compare own-class vs foreign-class.
**Refactorings:** Move Function, Extract Function then Move Function.

## divergent change

**Definition:** A single module is modified for many different reasons (commits touch it for unrelated features).
**Detect:** out of scope for static analysis — flag manually when noticed.
**Refactorings:** Split Phase, Extract Class.

## shotgun surgery

**Definition:** A single conceptual change requires edits across many modules.
**Detect:** when planning, if a finding requires touching >5 files for one logical change, flag.
**Refactorings:** Move Function, Inline Function, Combine Functions into Class.

## speculative generality

**Definition:** Abstractions (interfaces, base classes, hooks) with only one implementation/use.
**Detect:** find interface/abstract class with one implementer.
**Refactorings:** Inline Class, Collapse Hierarchy, Remove Dead Code.

## comments explaining what (not why)

**Definition:** Comments that paraphrase the code instead of explaining intent or constraint.
**Detect:** heuristic (low precision) — comment immediately above a single-statement line whose words overlap.
**Refactorings:** Extract Function (rename to express intent), Remove Comment.
