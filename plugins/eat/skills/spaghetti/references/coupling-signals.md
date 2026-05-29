# Coupling Signals

Modularity-level smells, mostly inspired by Ousterhout's *A Philosophy of Software Design*.

## shallow module

**Definition:** Module whose interface is roughly as complex as its implementation (the abstraction hides little).
**Detect:** ratio (public surface area lines / total module lines) > 0.3.
**Why bad:** no encapsulation benefit; readers must understand the full implementation anyway.
**Remedy:** widen responsibility (push more logic behind the interface) or merge with caller.

## pass-through method

**Definition:** A method whose body is a single call that forwards to another object with the same arguments.
**Detect:** method body is one line of `return this.x.method(args)` or `this.x.method(args)`.
**Why bad:** adds a step without adding value.
**Remedy:** Inline; let callers call the underlying method directly.

## deep dependency chain

**Definition:** Calling `a.b.c.d.method()` reaches across 4+ object boundaries.
**Detect:** regex on chained accesses, ≥4 dots before a call.
**Why bad:** violates Law of Demeter; brittle to any change in the chain.
**Remedy:** Move Function, Hide Delegate, or introduce a coordinator that owns the chain.

## circular import

**Definition:** Two or more modules import each other directly or transitively.
**Detect:** build import graph for scope; find cycles.
**Why bad:** load order bugs, hard to test in isolation.
**Remedy:** extract shared parts into a third module; invert dependency.

## global state mutation

**Definition:** Module mutates a global/singleton from inside a function that doesn't declare that as its purpose.
**Detect:** find writes to top-level `let`/`var`, `window.*`, `globalThis.*`, module-scoped mutables.
**Why bad:** action-at-a-distance; tests flaky; reasoning impossible.
**Remedy:** pass state explicitly; or isolate mutation to a single dedicated module.

## props drilling >3 levels

**Definition (React/similar):** Same prop passed through ≥3 components that don't use it themselves.
**Detect:** trace prop name through component tree.
**Why bad:** refactor brittleness; intermediate components grow noise.
**Remedy:** context, composition (`children`), or co-locate state with consumer.

## mixed concerns in a single file

**Definition:** One file contains UI rendering + data fetching + business rules + global state mutation.
**Detect:** look for `useState`/`useEffect` + `fetch`/`axios` + business logic + dispatch in the same file.
**Why bad:** changes in any one concern force re-reading all.
**Remedy:** Split Phase / Extract Class / extract custom hook (React) / extract service.

## hidden temporal coupling

**Definition:** Two functions must be called in a specific order, but the API does not enforce or document it.
**Detect:** function A initializes state that function B requires; no compiler check.
**Why bad:** silent bugs when order is broken.
**Remedy:** combine into one function; or make the order explicit via builder/state machine.
