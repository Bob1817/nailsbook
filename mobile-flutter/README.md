# NailBook Mobile

Flutter mobile app for NailBook clients and technicians.

## Setup

1. Start the backend: `cd backend && npm run start:dev`
2. Run the app: `cd mobile-flutter && flutter run`

### Backend URL

The app defaults to `http://10.0.2.2:3000` (Android emulator). Override with:

```bash
flutter run --dart-define=API_BASE_URL=http://your-server:3000
```

- iOS Simulator: `http://localhost:3000`
- Android Emulator: `http://10.0.2.2:3000`
- Physical device: your machine's LAN IP

## Architecture

```
lib/
  app/            App shell, router, role selection
  core/
    api/          HTTP client with role-based base paths
    auth/         Auth session state, secure token storage
    socket/       Socket.IO client for realtime chat
    upload/       Image upload service
    theme/        Mobile-first Material 3 theme
    widgets/      Shared UI components
  features/
    client/       Client-side screens and services
    technician/   Technician-side screens and services
    shared/       Shared features (chat UI)
```

## Testing

```bash
flutter test
flutter analyze
```
