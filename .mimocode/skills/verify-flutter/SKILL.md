---
name: verify-flutter
description: Run Flutter static analysis and tests on the mobile-flutter app, parse errors, fix them, and re-verify until clean. Use after any edit to .dart files.
---

# Flutter Verification Workflow

Runs `flutter analyze` and `flutter test` on the `mobile-flutter/` directory, interprets errors, fixes them, and loops until clean.

## When to use

- After editing any `.dart` file in `mobile-flutter/`
- Before committing Flutter changes
- When the user asks to "check flutter" or "run flutter tests"

## Procedure

### 1. Ensure Flutter is on PATH

```bash
export PATH="/Users/shibo/development/flutter/bin:$PATH"
```

Flutter is installed at `/Users/shibo/development/flutter/`. Always set PATH before running Flutter commands.

### 2. Run static analysis

```bash
cd mobile-flutter && export PATH="/Users/shibo/development/flutter/bin:$PATH" && flutter analyze 2>&1 | tail -15
```

### 3. Run tests

```bash
cd mobile-flutter && export PATH="/Users/shibo/development/flutter/bin:$PATH" && flutter test 2>&1 | tr '\r' '\n' | grep -E "All tests passed|failed|error" | tail -5
```

Use `timeout: 600000` for test runs — Flutter tests can be slow.

### 4. Interpret errors

Common Flutter errors and their fixes:

| Error pattern | Likely cause | Fix |
|---|---|---|
| `The method 'X' isn't defined for the type 'Y'` | Wrong API or missing import | Check class definition; add import |
| `The argument type 'X' can't be assigned to 'Y'` | Type mismatch | Cast or convert; check widget constructor params |
| `A value of type 'X?' can't be assigned to 'X'` | Null safety | Add `!` (if certain non-null), `?? default`, or null check |
| `Widget not found` / render overflow | UI layout issue | Check constraints, use `Expanded`/`Flexible`, add `SingleChildScrollView` |
| `setState() called after dispose()` | Async callback on disposed widget | Check `mounted` before `setState`; cancel subscriptions in `dispose()` |

### 5. Fix errors

- Edit the Dart source files to resolve each error.
- Preserve existing business logic — only fix analysis/test issues.
- If an error requires a design decision, note it and ask the user.

### 6. Re-verify

Re-run both analyze and test. Repeat steps 4-5 until clean.

### 7. Report

Report the result:
- ✅ "Flutter analyze passed, all tests passed"
- Or list remaining issues if they need user input

## Project-specific notes

- Flutter project is at `mobile-flutter/` (root: `/Users/shibo/Documents/Codex/nailBook/mobile-flutter`)
- Uses Riverpod for state management, go_router for routing
- Backend integration via REST API (same backend as webapp)
- When running in simulator, also check with `mcp__computer-use__screenshot` for visual verification if UI files were changed
- The `flutter analyze` command includes lint rules — fix lint warnings too, not just errors
