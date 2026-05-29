# Refactorings Catalog

Behavior-preserving transformations. Each entry has fixed structure: **When**, **Mechanics**, **Risk**, **Reversible**. Apply ONE at a time. Run tests between every refactoring.

> **Hard rule:** if a transformation could change observable behavior, it is NOT a refactoring — report it as a finding instead.

---

## Extract Function

**When:** long function, duplicated code, deep nesting, comment explaining what.
**Mechanics:**
1. Create new function with a name expressing *purpose* (not *what it does*).
2. Copy the extracted lines into the new function.
3. For every variable read in the extracted code but defined outside: add as parameter.
4. For every variable assigned in the extracted code and used after: return it (one) or return an object (multiple).
5. Replace original block with a call to the new function.
6. Run tests.

**Risk:** low.
**Reversible:** yes (Inline Function).

---

## Inline Function

**When:** pass-through method, function body as clear as its name.
**Mechanics:**
1. Confirm function is not polymorphic.
2. Find all callers.
3. Replace each call with the function body, adjusting parameter names.
4. Delete the function declaration.
5. Run tests.

**Risk:** low.
**Reversible:** yes (Extract Function).

---

## Extract Variable

**When:** complex expression; same subexpression repeated; need to add a comment but the expression has no name.
**Mechanics:**
1. Above the line, declare an immutable variable.
2. Assign it the subexpression.
3. Replace the subexpression with the variable name.
4. Run tests.

**Risk:** very low.
**Reversible:** yes (Inline Variable).

---

## Rename (Variable / Function / Type)

**When:** generic identifier, name doesn't express intent.
**Mechanics:**
1. If the symbol is exported, scan for every external usage first.
2. Use IDE rename if available; otherwise find-and-replace whole-word, case-sensitive.
3. Run tests.

**Risk:** low if scope is checked; medium if symbol crosses package boundaries.
**Reversible:** yes.

---

## Move Function

**When:** feature envy; function uses another class more than its own.
**Mechanics:**
1. Confirm the source class no longer needs the function (or can call it via the new home).
2. Cut function from source.
3. Paste into target module/class.
4. Adjust visibility and parameters (the previous `this` may become a parameter, or vice versa).
5. Update all call sites.
6. Run tests.

**Risk:** medium.
**Reversible:** yes.

---

## Introduce Parameter Object

**When:** long parameter list, data clumps.
**Mechanics:**
1. Define a new type/struct/object grouping the related parameters.
2. Add a new function signature that takes the object alongside the old signature (deprecation pattern), OR change in place if you control all callers.
3. Update each caller to pass the object.
4. Remove the old parameters from the signature.
5. Run tests.

**Risk:** medium.
**Reversible:** yes.

---

## Replace Nested Conditional with Guard Clauses

**When:** deep nesting from cascading `if/else`.
**Mechanics:**
1. Identify the "happy path" — the deepest non-error case.
2. For each precondition, add `if (!precondition) return earlyResult;` at the top.
3. Delete the now-redundant `else` branches.
4. Run tests.

**Risk:** low.
**Reversible:** yes.

---

## Decompose Conditional

**When:** complex `if/else` whose condition and branches each deserve a name.
**Mechanics:**
1. Extract the condition into a function with an intent-expressing name (`isEligibleForDiscount`).
2. Extract each branch body into a function (`applyDiscount`, `applyFullPrice`).
3. The conditional now reads as `if (isEligibleForDiscount(x)) applyDiscount(x); else applyFullPrice(x);`.
4. Run tests.

**Risk:** low.
**Reversible:** yes.

---

## Replace Temp with Query

**When:** local variable assigned once from an expression, used several times.
**Mechanics:**
1. Confirm the expression is pure (no side effects, idempotent).
2. Extract the expression into a function (or method).
3. Replace each use of the temp variable with a call to the function.
4. Delete the temp.
5. Run tests.

**Risk:** low (be sure about purity).
**Reversible:** yes.

---

## Split Phase

**When:** function/module mixes concerns (e.g., parsing + computing + rendering).
**Mechanics:**
1. Identify the boundary between the two phases (often a data structure passed between them).
2. Extract the second phase into its own function returning a value.
3. Make the first phase return the intermediate structure.
4. Call them in sequence at the original call site.
5. Run tests.

**Risk:** medium.
**Reversible:** yes (Inline).

---

## Extract Class

**When:** large class doing two things; data clumps appear together repeatedly.
**Mechanics:**
1. Create the new class.
2. Move the related fields into it.
3. Move methods that primarily touch those fields.
4. Add a field on the original class holding an instance of the new class.
5. Update internal callers to go through the new field.
6. Run tests.

**Risk:** medium.
**Reversible:** yes (Inline Class).

---

## Inline Class

**When:** single-implementation interface; thin class that adds no value.
**Mechanics:**
1. Find all consumers.
2. Move members back into the consumer class (or merge with another class).
3. Update references.
4. Delete the inlined class.
5. Run tests.

**Risk:** medium.
**Reversible:** yes (Extract Class).

---

## Consolidate Duplicate Code

**When:** near-duplicate blocks; duplicated code smell.
**Mechanics:**
1. Identify the differing parts between duplicates.
2. Apply Extract Function with those parts as parameters.
3. Replace each duplicate with a call.
4. Run tests.

**Risk:** low.
**Reversible:** yes.

---

## Replace Parameter with Explicit Methods

**When:** boolean flag parameter.
**Mechanics:**
1. For each value of the flag, create a separately named function that doesn't take the flag.
2. Move the relevant branch body into each.
3. Update callers to call the right specific function.
4. Delete the original.
5. Run tests.

**Risk:** low.
**Reversible:** yes.

---

## Remove Dead Code

**When:** dead code / unused export, commented-out code, single-impl interface that won't be inlined yet (just delete it).
**Mechanics:**
1. Re-confirm zero callers across the dep-expanded scope.
2. Delete the symbol.
3. Run tests.

**Risk:** low if scope is verified; medium otherwise.
**Reversible:** trivially via VCS.

---

## Hide Delegate

**When:** deep dependency chain.
**Mechanics:**
1. On the object holding the inner reference, add a method that performs the delegated call.
2. Update callers to use the new method.
3. (Optional) Make the inner reference private.
4. Run tests.

**Risk:** low.
**Reversible:** yes (Remove Middle Man).

---

## Forbidden (not refactorings)

These change observable behavior and **must not** be done by this skill — they are findings, not refactorings:
- Fixing a bug, even an "obvious" one.
- Changing default values.
- Adding/removing error cases.
- Changing the order of side effects.
- Adding logging, metrics, or telemetry.
- Introducing new abstractions (interface, factory, abstract class) that didn't exist.
- Changing public API signatures in ways callers can observe (param removal, return type widening/narrowing).
