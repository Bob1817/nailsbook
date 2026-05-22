# Deep Linking

## Invite URL Format

```
https://<domain>/invite?invite_code=<code>&tech_id=<id>
```

- `invite_code` (required): The technician's invitation code
- `tech_id` (optional): The technician's numeric ID

## Behavior

| App State | Behavior |
|-----------|----------|
| App installed | Invite opens Flutter invite flow → client registration with pre-filled invite code |
| App not installed | Invite opens React WebApp invite flow in browser |

## Android App Links

Configure in `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="<domain>" android:pathPrefix="/invite" />
</intent-filter>
```

Host `.well-known/assetlinks.json` at `https://<domain>/.well-known/assetlinks.json`.

## iOS Universal Links

Configure in `ios/Runner/Runner.entitlements`:

```xml
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:<domain></string>
</array>
```

Host `apple-app-site-association` at `https://<domain>/.well-known/apple-app-site-association`.

## Flutter Integration

The `DeepLinkService` in `lib/core/deeplink/deep_link_service.dart` handles:
1. Initial link on cold start via `getInitialLink()`
2. Incoming links while app is running via `uriLinkStream`
3. Parsing invite parameters from the URL

The router redirects invite links to `/client/login` with `invite_code` and `tech_id` as query parameters, which the `ClientLoginScreen` uses to pre-fill the invite code and auto-switch to registration mode.
