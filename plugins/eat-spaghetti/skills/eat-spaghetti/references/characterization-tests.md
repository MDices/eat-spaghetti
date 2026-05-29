# Characterization Tests

Tests that lock in the **current** behavior of a unit, including its bugs. They are scaffolding — they exist to give the refactoring phase a green/red signal. After refactoring is done, the user decides whether to keep, fix, or delete them.

## When this Phase ABORTS the pipeline

Phase 2 must abort and recommend manual refactor when **any** of:
- The project has no test framework configured (no `package.json` test script, no `pytest` available, no `cargo test` target, no `go test`).
- The unit has non-deterministic behavior (network calls, system time, random) with no seam to stub.
- The unit's only outputs are side effects (DB writes, file I/O, network) with no observable return value AND no way to spy on the side effect.

When aborting, output: which unit failed, why, and what would unblock it (e.g., "add `vi.useFakeTimers()` and seed `Math.random`").

## The Recipe (Feathers)

1. **Find the seam.** A seam is a place where you can change observable behavior without editing the unit. Function return values, dependency injection points, mockable globals — all seams.
2. **Pick concrete inputs.** Use real values from production logs or a manual run. Do not invent edge cases yet.
3. **Run the unit; capture the output.** Use a console snapshot or a single `console.log` then read it.
4. **Assert that exact output.** Write the test so it asserts the literal output you just captured.
5. **Note surprises.** If the captured output looks wrong, write a note (`// CHARACTERIZATION: returns "" instead of throwing — verify behavior is intentional`) — do NOT fix.
6. **Cover branches.** Repeat for inputs that exercise different code paths. Use coverage if available to confirm.
7. **Run all characterization tests. They must all pass before Phase 3 begins.**

## Templates

### Jest / Vitest (TypeScript)

```typescript
import { describe, it, expect } from 'vitest';
import { functionUnderTest } from '../src/path';

describe('@characterization functionUnderTest', () => {
  it('locks current behavior for input A', () => {
    const result = functionUnderTest({ /* concrete input */ });
    expect(result).toEqual(/* literal output captured from real run */);
  });

  it('locks current behavior for input B (branch X)', () => {
    const result = functionUnderTest({ /* different input */ });
    expect(result).toEqual(/* literal output */);
  });
});
```

### Pytest (Python)

```python
import pytest
from src.path import function_under_test

class TestCharacterizationFunctionUnderTest:
    """@characterization — locks current behavior for safe refactoring."""

    def test_current_behavior_input_a(self):
        result = function_under_test({"key": "value"})
        assert result == {"locked": "output"}

    def test_current_behavior_input_b_branch_x(self):
        result = function_under_test({"key": "other"})
        assert result == {"locked": "different_output"}
```

### Go

```go
package mypkg_test

import (
    "testing"
    "reflect"
    "yourmod/mypkg"
)

func TestCharacterization_FunctionUnderTest_InputA(t *testing.T) {
    got := mypkg.FunctionUnderTest(/* input */)
    want := /* literal captured output */
    if !reflect.DeepEqual(got, want) {
        t.Fatalf("characterization broken: got %v want %v", got, want)
    }
}
```

### Cargo (Rust)

```rust
#[cfg(test)]
mod characterization {
    use super::*;

    #[test]
    fn current_behavior_input_a() {
        let result = function_under_test(/* input */);
        assert_eq!(result, /* literal captured */);
    }
}
```

## Naming and Tagging

Every characterization test:
- Has `@characterization` in its describe/class/function name or doc.
- Lives next to the regular tests (do not invent a parallel directory).
- Gets committed alongside the unit it characterizes, BEFORE Phase 3 begins.

## After Refactoring

Characterization tests sometimes encode bugs. After the refactor, the user reviews them: keep as-is (lock the legacy contract), update to correct behavior (only if a separate bug-fix task), or delete (one-shot scaffolding).
