# Flutter Staged Release Plan

## Release Gates

### Alpha
- **Target:** Internal team install, local/staging backend
- **Entry criteria:**
  - All Phase 2-5 features implemented
  - `flutter analyze` passes with 0 errors
  - `flutter test` passes
  - Backend contract tests pass
  - React builds pass
- **Distribution:** TestFlight (iOS) / Internal testing track (Android)
- **Duration:** 1-2 weeks

### Beta
- **Target:** Selected technicians and clients
- **Entry criteria:**
  - Alpha gate passed
  - Deep link invite flow tested on both platforms
  - Push notifications working on both platforms
  - Chat works cross-client (React ↔ Flutter)
  - Regression matrix executed with no critical failures
- **Distribution:** TestFlight external testing / Google Play internal testing
- **Duration:** 2-3 weeks

### Production
- **Target:** Public distribution
- **Entry criteria:**
  - Beta gate passed
  - Full regression matrix passed
  - Performance acceptable on low-end devices
  - Crash-free rate > 99%
  - App Store / Play Store review guidelines met
- **Distribution:** App Store / Google Play
- **Rollout:** 10% → 50% → 100% over 1 week

## Rollback Plan

- React WebApps remain available at all times
- Mobile-only features can be disabled with backend feature flags
- Invite links remain web-compatible (deep link falls back to React)
- If critical Flutter bug found:
  1. Disable Flutter-specific feature flags
  2. Communicate to users to use React WebApp
  3. Fix and re-release through Alpha → Beta → Production

## Monitoring

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Login failures | Backend logs | > 5% failure rate |
| API error rate by client type | Backend logs | > 2% error rate |
| Socket disconnect rate | Backend logs | > 10% disconnect rate |
| Upload failures | Backend logs | > 5% failure rate |
| Push delivery failures | FCM/APNs reports | > 10% failure rate |
| Crash-free rate | Firebase Crashlytics | < 99% |
| ANR rate (Android) | Google Play Console | > 0.5% |
| App launch time | Firebase Performance | > 3s cold start |
