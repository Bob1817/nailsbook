# Flutter CI Checks

## Required Checks

### 1. Backend Contract Tests
```bash
cd backend && npm test -- --runInBand
```
Ensures API contracts are stable for both React and Flutter clients.

### 2. React Client Build
```bash
cd client-frontend && npm run build
```

### 3. React Technician Build
```bash
cd technician-frontend && npm run build
```

### 4. Flutter Analyze
```bash
cd mobile-flutter && flutter analyze
```
Expected: 0 errors.

### 5. Flutter Tests
```bash
cd mobile-flutter && flutter test
```
Expected: all tests pass.

## Local Verification

Run all checks in sequence:
```bash
cd backend && npm test -- --runInBand && \
cd ../client-frontend && npm run build && \
cd ../technician-frontend && npm run build && \
cd ../mobile-flutter && flutter analyze && \
cd ../mobile-flutter && flutter test
```

## CI Pipeline (Recommended)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd backend && npm ci && npm test -- --runInBand

  react-client:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd client-frontend && npm ci && npm run build

  react-technician:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd technician-frontend && npm ci && npm run build

  flutter:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.19.x'
      - run: cd mobile-flutter && flutter pub get && flutter analyze && flutter test
```

## Compatibility Rules

- No breaking changes to `/api/client/*`, `/api/technician/*`, or Socket.IO event names without updating both React and Flutter.
- See `docs/flutter/compatibility-rules.md` for full API prefix list.
