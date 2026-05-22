# Push Notifications

## Provider Choice

- **Global distribution:** FCM (Firebase Cloud Messaging) for Android and iOS
- **China distribution:** Add China vendor push (e.g., Huawei HMS Push, Xiaomi Push) in a later phase if App Store distribution requires it

## Architecture

```
Backend → FCM/APNs → Device
                    ↕
         Flutter PushNotificationService
                    ↕
         Token registration on backend
```

## Device Token Registration

1. On login, `PushNotificationService.init()` requests permission and gets FCM token
2. Token is sent to backend via `POST /api/{role}/auth/device-token`
3. Backend stores token keyed by `userId + role + platform`
4. On token refresh, re-register with backend

## Backend Endpoints Needed

### Client
- `POST /api/client/auth/device-token` — Register/update device token
- `DELETE /api/client/auth/device-token` — Unregister on logout

### Technician
- `POST /api/technician/auth/device-token` — Register/update device token
- `DELETE /api/technician/auth/device-token` — Unregister on logout

## Notification Types

| Event | Title | Body |
|-------|-------|------|
| New message | {sender} | {message preview} |
| Quote created | 报价通知 | 您的预约已收到报价 |
| Booking confirmed | 预约确认 | 美甲师已确认您的预约 |
| Order reminder | 预约提醒 | 您有即将到来的预约 |

## Data Payload

```json
{
  "type": "new_message | quote_created | booking_confirmed | order_reminder",
  "orderId": 123,
  "conversationId": 456,
  "techId": 789,
  "clickAction": "OPEN_ORDER | OPEN_CHAT | OPEN_HOME"
}
```

## Foreground Handling

When app is in foreground:
- Show in-app notification banner
- Navigate to relevant screen on tap

## Background Handling

When app is in background:
- System notification shown by OS
- On tap: open app and navigate to relevant screen via deep link

## iOS Configuration

1. Add push notification capability in Xcode
2. Upload APNs key to Firebase console
3. Add `GoogleService-Info.plist` to `ios/Runner/`

## Android Configuration

1. Add `google-services.json` to `android/app/`
2. Add Firebase messaging dependency (already included via `firebase_messaging` package)
