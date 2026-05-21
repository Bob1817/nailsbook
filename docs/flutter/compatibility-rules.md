# Flutter Compatibility Rules

## Compatibility Rule

Do not make breaking changes to existing `/api/client/*`, `/api/technician/*`, or Socket.IO event names unless both React WebApps and Flutter are updated in the same compatibility window.

React WebApps remain compatibility clients. The client and technician React frontends must continue building after API or event-name changes, even when Flutter is the implementation focus.

## Critical Current API Prefixes

Client API prefixes:

- `/api/client/auth`
- `/api/client/home`
- `/api/client/works`
- `/api/client/orders`
- `/api/client/designs`
- `/api/client/custom-service-requests`
- `/api/client/addresses`
- `/api/client/messages`
- `/api/client/uploads`

Technician API prefixes:

- `/api/technician/auth`
- `/api/technician/orders`
- `/api/technician/customers`
- `/api/technician/messages`
- `/api/technician/works`
- `/api/technician/services`
- `/api/technician/uploads`

## Verification

Before claiming compatibility is preserved, run the narrowest relevant React WebApp builds:

```sh
(cd client-frontend && npm run build)
(cd technician-frontend && npm run build)
```
