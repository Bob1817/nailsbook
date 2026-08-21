---
name: verify-ts
description: Run TypeScript type-check on nailBook frontends (client-frontend or technician-frontend), parse errors, fix them, and re-verify until clean. Use after any edit to .ts/.tsx files.
---

# TypeScript Verification Workflow

Runs `npx tsc --noEmit` on the specified frontend, interprets errors, fixes them, and loops until the check passes.

## When to use

- After editing any `.ts` or `.tsx` file in `client-frontend/` or `technician-frontend/`
- Before committing frontend changes
- When the user asks to "check types" or "verify TypeScript"

## Procedure

### 1. Determine target

- If the user specified a frontend, use it.
- Otherwise, detect from the files you just edited:
  - Files under `client-frontend/` → run on `client-frontend`
  - Files under `technician-frontend/` → run on `technician-frontend`
  - Files in both → run on both sequentially

### 2. Run type-check

```bash
cd <frontend-dir> && npx tsc --noEmit 2>&1 | tail -30
```

Use `tail -30` to capture the most relevant errors. If the output is truncated, re-run without `tail` and use Grep to find error lines.

### 3. Interpret errors

Common nailBook TypeScript errors and their fixes:

| Error pattern | Likely cause | Fix |
|---|---|---|
| `Property 'X' does not exist on type` | Missing type definition or wrong API shape | Add interface/type or check API response shape |
| `Argument of type 'X' is not assignable` | Mismatched props/state types | Align types; use optional chaining for nullable |
| `Cannot find module 'X'` | Missing import or deleted file | Check if file exists; update import path |
| `Type 'X' is not assignable to 'Y'` | Implicit `any` or wrong generic | Add explicit type annotation |
| `Object is possibly 'undefined'` | Missing null check | Add optional chaining `?.` or null guard |

### 4. Fix errors

- Edit the source files to resolve each error.
- Preserve existing business logic — only fix type issues.
- If an error requires a design decision (e.g., adding a new interface), note it and ask the user.

### 5. Re-verify

Re-run the type-check. Repeat steps 3-4 until clean.

### 6. Report

Report the result:
- ✅ "TypeScript check passed for `client-frontend`" (or whichever)
- Or list remaining errors if they need user input

## Project-specific notes

- `client-frontend` is a React + TypeScript SPA for nail art clients
- `technician-frontend` is a React + TypeScript SPA for nail technicians
- Both use `npx tsc --noEmit` for type-checking (no custom tsconfig scripts)
- WeChat mini-program files (`client-wxapp/`) are NOT TypeScript — skip for this skill
- Backend (`backend/`) is JavaScript, not TypeScript
