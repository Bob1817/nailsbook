# Flutter API Inventory

Source inventory from `client-frontend/src/services/*.ts` and `technician-frontend/src/services/*.ts`.
Statuses are:

- Required for Flutter MVP: needed for mobile login, booking/design requests, order operations, upload, customer/service/work management, and chat.
- Required after MVP: useful mobile features that are not core to first booking/chat workflows.
- React-only: current React compatibility surface or calls that should not be copied into Flutter without backend alignment.

## Client REST API

Base URL: `/api/client`.

| Feature | Method | Path | Source service | Status | Backend route/controller notes |
|---|---:|---|---|---|---|
| Auth | GET | `/api/client/auth/find-by-invite-code?code=` | `auth.ts` | Required for Flutter MVP | Exists: `client-auth.controller.ts` `@Get('find-by-invite-code')`. |
| Auth | POST | `/api/client/auth/request-login-code` | `auth.ts` | Required for Flutter MVP | Exists: `@Post('request-login-code')`. |
| Auth | POST | `/api/client/auth/request-register-code` | `auth.ts` | Required for Flutter MVP | Exists: `@Post('request-register-code')`. |
| Auth | POST | `/api/client/auth/register-by-invite` | `auth.ts` | Required for Flutter MVP | Exists: `@Post('register-by-invite')`. |
| Auth | POST | `/api/client/auth/login` | `auth.ts` | Required for Flutter MVP | Exists: `@Post('login')`. |
| Auth | GET | `/api/client/auth/me` | `auth.ts` | Required for Flutter MVP | Exists: `@Get('me')`. |
| Auth | POST | `/api/client/auth/bind-technician` | `auth.ts` | Required for Flutter MVP | Exists: `@Post('bind-technician')`. |
| Auth | DELETE | `/api/client/auth/unbind-technician/:techId` | `auth.ts` | Required after MVP | Exists: `@Delete('unbind-technician/:techId')`. |
| Auth | POST | `/api/client/auth/set-default-technician/:techId` | `auth.ts` | Required for Flutter MVP | Exists: `@Post('set-default-technician/:techId')`. |
| Auth | PUT | `/api/client/auth/me` | `auth.ts` | Required after MVP | Exists: `@Put('me')`. |
| Home | GET | `/api/client/home` | `home.ts` | Required for Flutter MVP | Exists: `client-home.controller.ts` `@Get('home')`. |
| Works browsing | GET | `/api/client/works` | `works.ts` | Required for Flutter MVP | Exists: `client-home.controller.ts` `@Get('works')`. |
| Works browsing | GET | `/api/client/works/:id` | `works.ts` | Required for Flutter MVP | Exists: `@Get('works/:id')`. |
| Works browsing | GET | `/api/client/home/works` | `home.ts` | React-only | No matching backend route found; Flutter should use `/api/client/works`. |
| Works browsing | GET | `/api/client/home/works/:id` | `home.ts` | React-only | No matching backend route found; Flutter should use `/api/client/works/:id`. |
| Works social | POST | `/api/client/works/:id/like` | `works.ts` | Required after MVP | Exists: `@Post('works/:id/like')`. |
| Works social | POST | `/api/client/works/:id/favorite` | `works.ts` | Required after MVP | Exists: `@Post('works/:id/favorite')`. |
| Works social | GET | `/api/client/works/:id/comments` | `works.ts` | Required after MVP | Exists: `@Get('works/:id/comments')`. |
| Works social | POST | `/api/client/works/:id/comments` | `works.ts` | Required after MVP | Exists: `@Post('works/:id/comments')`. |
| Addresses | GET | `/api/client/addresses` | `address.ts` | Required for Flutter MVP | Exists: `client-addresses.controller.ts` `@Get()`. |
| Addresses | POST | `/api/client/addresses` | `address.ts` | Required for Flutter MVP | Exists: `@Post()`. |
| Addresses | PATCH | `/api/client/addresses/:id` | `address.ts` | Required for Flutter MVP | Exists: `@Patch(':id')`. |
| Addresses | DELETE | `/api/client/addresses/:id` | `address.ts` | Required after MVP | Exists: `@Delete(':id')`. |
| Addresses | POST | `/api/client/addresses/:id/default` | `address.ts` | Required for Flutter MVP | Exists: `@Post(':id/default')`. |
| Orders | GET | `/api/client/orders` | `order.ts` | Required for Flutter MVP | Exists: `client-orders.controller.ts` `@Get()`. |
| Orders | GET | `/api/client/orders/trips` | `order.ts` | Required after MVP | Exists: `@Get('trips')`. |
| Orders | GET | `/api/client/orders/:id` | `order.ts` | Required for Flutter MVP | Exists: `@Get(':id')`. |
| Orders | POST | `/api/client/orders` | `order.ts` | Required for Flutter MVP | Exists: `@Post()`. |
| Orders | POST | `/api/client/orders/from-design` | `order.ts` | Required for Flutter MVP | Exists: `@Post('from-design')`. |
| Orders | PATCH | `/api/client/orders/:id` | `order.ts` | Required for Flutter MVP | Exists: `@Patch(':id')`. |
| Orders | POST | `/api/client/orders/:id/agree` | `order.ts` | Required for Flutter MVP | Exists: `@Post(':id/agree')`. |
| Orders | POST | `/api/client/orders/:id/reject-quote` | `order.ts` | Required for Flutter MVP | Exists: `@Post(':id/reject-quote')`. |
| Orders | PATCH | `/api/client/orders/:id/status` | `order.ts` | Required after MVP | Exists: `@Patch(':id/status')`. |
| Designs | GET | `/api/client/designs` | `design.ts` | Required for Flutter MVP | Exists: `client-designs.controller.ts` `@Get()`. |
| Designs | GET | `/api/client/designs/:id` | `design.ts` | Required for Flutter MVP | Exists: `@Get(':id')`. |
| Designs | POST | `/api/client/designs` | `design.ts` | Required for Flutter MVP | Exists: `@Post()`. |
| Designs | PATCH | `/api/client/designs/:id` | `design.ts` | Required for Flutter MVP | Exists: `@Patch(':id')`. |
| Designs | DELETE | `/api/client/designs/:id` | `design.ts` | Required after MVP | Exists: `@Delete(':id')`. |
| Designs | PATCH | `/api/client/designs/:id/switch-technician` | `design.ts` | Required after MVP | Exists: `@Patch(':id/switch-technician')`. |
| Designs | POST | `/api/client/designs/:id/quote-request` | `design.ts` | React-only | No matching backend route found. |
| Designs | POST | `/api/client/designs/:id/accept-quote` | `design.ts` | React-only | No matching backend route found. Use order/custom-service quote flows instead. |
| Designs | POST | `/api/client/designs/:id/reject-quote` | `design.ts` | React-only | No matching backend route found. Use order/custom-service quote flows instead. |
| Custom service requests | POST | `/api/client/client/custom-service-requests` | `customServiceRequest.ts` | React-only | Actual extracted React call: service string `/client/custom-service-requests` under base `/api/client`. No matching backend route found. |
| Custom service requests | GET | `/api/client/client/custom-service-requests` | `customServiceRequest.ts` | React-only | Actual extracted React call. No matching backend route found. |
| Custom service requests | GET | `/api/client/client/custom-service-requests/:id` | `customServiceRequest.ts` | React-only | Actual extracted React call. No matching backend route found. |
| Custom service requests | PATCH | `/api/client/client/custom-service-requests/:id/accept` | `customServiceRequest.ts` | React-only | Actual extracted React call. No matching backend route found. |
| Custom service requests | PATCH | `/api/client/client/custom-service-requests/:id/reject` | `customServiceRequest.ts` | React-only | Actual extracted React call. No matching backend route found. |
| Custom service requests | PATCH | `/api/client/client/custom-service-requests/:id/cancel` | `customServiceRequest.ts` | React-only | Actual extracted React call. No matching backend route found. |
| Custom service requests | POST | `/api/client/custom-service-requests` | canonical backend route | Required for Flutter MVP | Exists: `client-custom-service-requests.controller.ts` `@Post()`. Flutter should use this canonical backend path, not the extracted React service string. |
| Custom service requests | GET | `/api/client/custom-service-requests` | canonical backend route | Required for Flutter MVP | Exists: `@Get()`. Flutter should use this canonical backend path. |
| Custom service requests | GET | `/api/client/custom-service-requests/:id` | canonical backend route | Required for Flutter MVP | Exists: `@Get(':id')`. Flutter should use this canonical backend path. |
| Custom service requests | PATCH | `/api/client/custom-service-requests/:id/accept` | canonical backend route | Required for Flutter MVP | Exists: `@Patch(':id/accept')`. Flutter should use this canonical backend path. |
| Custom service requests | PATCH | `/api/client/custom-service-requests/:id/reject` | canonical backend route | Required for Flutter MVP | Exists: `@Patch(':id/reject')`. Flutter should use this canonical backend path. |
| Custom service requests | PATCH | `/api/client/custom-service-requests/:id/cancel` | canonical backend route | Required for Flutter MVP | Exists: `@Patch(':id/cancel')`. Flutter should use this canonical backend path. |
| Upload | POST | `/api/client/uploads/image` | `upload.ts` | Required for Flutter MVP | Exists: `client-upload.controller.ts` `@Post('image')`. |
| Messages | GET | `/api/client/messages/conversations` | `message.ts` | Required for Flutter MVP | Exists: `client-messages.controller.ts` `@Get('conversations')`. |
| Messages | GET | `/api/client/messages?conversation_id=` | `message.ts` | Required for Flutter MVP | Exists: `@Get()`. |
| Messages | POST | `/api/client/messages` | `message.ts` | Required for Flutter MVP | Exists: `@Post()`. |
| Messages | PATCH | `/api/client/messages/read` | `message.ts` | Required for Flutter MVP | Exists: `@Patch('read')`. |

## Technician REST API

Base URL: `/api/technician`.

| Feature | Method | Path | Source service | Status | Backend route/controller notes |
|---|---:|---|---|---|---|
| Auth | POST | `/api/technician/auth/login` | `auth.ts` | Required for Flutter MVP | Exists: `technician-auth.controller.ts` `@Post('login')`. |
| Auth | GET | `/api/technician/auth/me` | `auth.ts` | Required for Flutter MVP | Exists: `@Get('me')`. |
| Auth | PATCH | `/api/technician/auth/status` | `auth.ts` | Required for Flutter MVP | Exists: `@Patch('status')`. |
| Auth | POST | `/api/technician/auth/request-code` | `auth.ts` | Required for Flutter MVP | Exists: `@Post('request-code')`. |
| Auth/profile | PATCH | `/api/technician/auth/service-type` | `auth.ts` | Required for Flutter MVP | Exists: `@Patch('service-type')`. |
| Auth/profile | PATCH | `/api/technician/auth/profile` | `auth.ts` | Required for Flutter MVP | Exists: `@Patch('profile')`. |
| Orders | GET | `/api/technician/orders` | `orders.ts` | Required for Flutter MVP | Exists: `technician-orders.controller.ts` `@Get()`. Supports `status` and `customerId`. |
| Orders | GET | `/api/technician/orders/:id` | `orders.ts` | Required for Flutter MVP | Exists: `@Get(':id')`. |
| Orders | GET | `/api/technician/orders/trips` | `orders.ts` | Required for Flutter MVP | Exists: `@Get('trips')`. |
| Orders | PATCH | `/api/technician/orders/:id/review` | `orders.ts` | Required for Flutter MVP | Exists: `@Patch(':id/review')`. |
| Orders | PATCH | `/api/technician/orders/:id/confirm` | `orders.ts` | Required for Flutter MVP | Exists: `@Patch(':id/confirm')`. |
| Orders | PATCH | `/api/technician/orders/:id/complete` | `orders.ts` | Required for Flutter MVP | Exists: `@Patch(':id/complete')`. |
| Orders | PATCH | `/api/technician/orders/:id/cancel` | `orders.ts` | Required for Flutter MVP | Exists: `@Patch(':id/cancel')`. |
| Orders | POST | `/api/technician/orders` | `orders.ts` | Required after MVP | Exists: `@Post()`. React has local fallback draft behavior. |
| Orders | PATCH | `/api/technician/orders/:id` | `orders.ts` | React-only | No matching technician backend route found. |
| Customers | GET | `/api/technician/customers` | `customers.ts` | Required for Flutter MVP | Exists: `technician-customers.controller.ts` `@Get()`. |
| Customers | GET | `/api/technician/customers/:id` | `customers.ts` | Required for Flutter MVP | Exists: `@Get(':id')`. |
| Customers | PATCH | `/api/technician/customers/:id/tags` | `customers.ts` | Required for Flutter MVP | Exists: `@Patch(':id/tags')`. |
| Customers | GET | `/api/technician/customers/tags` | `customers.ts` | Required for Flutter MVP | Exists: `@Get('tags')`. |
| Works management | GET | `/api/technician/works` | `works.ts` | Required for Flutter MVP | Exists: `technician-works.controller.ts` `@Get()`. |
| Works management | GET | `/api/technician/works/:id` | `works.ts` | Required for Flutter MVP | Exists: `@Get(':id')`. |
| Works management | POST | `/api/technician/works` | `works.ts` | Required for Flutter MVP | Exists: `@Post()`. |
| Works management | PATCH | `/api/technician/works/:id` | `works.ts` | Required for Flutter MVP | Exists: `@Patch(':id')`. |
| Works management | DELETE | `/api/technician/works/:id` | `works.ts` | Required for Flutter MVP | Exists: `@Delete(':id')`. |
| Works management | POST | `/api/technician/works/:id/toggle-visible` | `works.ts` | Required for Flutter MVP | Exists: `@Post(':id/toggle-visible')`. |
| Works management | POST | `/api/technician/works/:id/toggle-pinned` | `works.ts` | Required after MVP | Exists: `@Post(':id/toggle-pinned')`. |
| Works management | POST | `/api/technician/works/:id/toggle-featured` | `works.ts` | Required after MVP | Exists: `@Post(':id/toggle-featured')`. |
| Works social | POST | `/api/technician/works/:id/like` | `works.ts` | Required after MVP | Exists: `@Post(':id/like')`. |
| Works social | POST | `/api/technician/works/:id/favorite` | `works.ts` | Required after MVP | Exists: `@Post(':id/favorite')`. |
| Works comments | GET | `/api/technician/works/:id/comments` | `works.ts` | Required after MVP | Exists: `@Get(':id/comments')`. |
| Works comments | POST | `/api/technician/works/:id/comments` | `works.ts` | Required after MVP | Exists: `@Post(':id/comments')`. |
| Works comments | DELETE | `/api/technician/works/:workId/comments/:commentId` | `works.ts` | Required after MVP | Exists: `@Delete(':workId/comments/:commentId')`. |
| Works comments | POST | `/api/technician/works/:id/mark-comments-read` | `works.ts` | Required after MVP | Exists: `@Post(':id/mark-comments-read')`. |
| Services | GET | `/api/technician/services` | `services.ts` | Required for Flutter MVP | Exists: `technician-services.controller.ts` `@Get()`. |
| Services | POST | `/api/technician/services` | `services.ts` | Required for Flutter MVP | Exists: `@Post()`. |
| Services | PATCH | `/api/technician/services/:id` | `services.ts` | Required for Flutter MVP | Exists: `@Patch(':id')`. |
| Services | DELETE | `/api/technician/services/:id` | `services.ts` | Required for Flutter MVP | Exists: `@Delete(':id')`. |
| Services | PATCH | `/api/technician/services/:id/toggle` | `services.ts` | Required for Flutter MVP | Exists: `@Patch(':id/toggle')`. |
| Custom service requests | GET | `/api/technician/custom-service-requests` | backend only | Required for Flutter MVP | Exists: `technician-custom-service-requests.controller.ts` `@Get()`. No current technician React service wrapper found, but Flutter needs it to quote client custom requests. |
| Custom service requests | GET | `/api/technician/custom-service-requests/:id` | backend only | Required for Flutter MVP | Exists: `@Get(':id')`. |
| Custom service requests | PATCH | `/api/technician/custom-service-requests/:id/quote` | backend only | Required for Flutter MVP | Exists: `@Patch(':id/quote')`. |
| Subscriptions | GET | `/api/technician/subscriptions/plans` | `subscription.ts` | Required after MVP | Exists: `subscriptions.controller.ts` `@Get('plans')`. |
| Upload | POST | `/api/technician/uploads/image` | `upload.ts` | Required for Flutter MVP | Exists: `technician-upload.controller.ts` `@Post('image')`. |
| Messages | GET | `/api/technician/messages/conversations` | `message.ts` | Required for Flutter MVP | Exists: `technician-messages.controller.ts` `@Get('conversations')`. |
| Messages | GET | `/api/technician/messages?conversation_id=` | `message.ts` | Required for Flutter MVP | Exists: `@Get()`. |
| Messages | POST | `/api/technician/messages` | `message.ts` | Required for Flutter MVP | Exists: `@Post()`. |
| Messages | PATCH | `/api/technician/messages/read` | `message.ts` | Required for Flutter MVP | Exists: `@Patch('read')`. |

## Socket.IO Events

Namespace: `/`. React clients connect with `auth: { token: "Bearer <jwt>" }` and websocket/polling transports. Backend is `backend/src/chat/chat.gateway.ts`.

| Event | Direction | Payload notes | Status | Backend route/controller notes |
|---|---|---|---|---|
| `message:send` | client emits | Message DTO: conversation/client/technician target plus content fields. | Required for Flutter MVP | Exists: `@SubscribeMessage('message:send')`; joins `conversation:{id}` and returns `message:sent`. |
| `message:sent` | server ack | `{ message, conversation }`. | Required for Flutter MVP | Returned from `message:send`. |
| `message:new` | server emits | `{ message, conversation }` to conversation room. | Required for Flutter MVP | Emitted after `message:send`. |
| `message:read` | client emits and server emits | Client sends `{ conversationId }`; server broadcasts read metadata. | Required for Flutter MVP | Exists: `@SubscribeMessage('message:read')`. |
| `message:read:ack` | server ack | `{ success: true }`. | Required for Flutter MVP | Returned from `message:read`. |
| `typing:start` | client emits and server emits | `{ conversationId }`; server includes user identity. | Required after MVP | Exists: `@SubscribeMessage('typing:start')`. |
| `typing:stop` | client emits and server emits | `{ conversationId }`; server includes user identity. | Required after MVP | Exists: `@SubscribeMessage('typing:stop')`; also auto-emitted when typing timeout expires. |
| `presence:sync` | server emits on connect | `{ onlineUsers }`. | Required after MVP | Emitted during gateway connection. |
| `presence:online` | server emits | `{ userId, userType }`. | Required after MVP | Emitted when a user joins presence. |
| `presence:offline` | server emits | `{ userId, userType }`. | Required after MVP | Emitted when a user leaves presence. |

## Verification Notes

Verification command run:

```bash
rg "@Controller|@Get|@Post|@Patch|@Delete|@Put" backend/src
```

Summary:

- Every endpoint marked Required for Flutter MVP has a matching backend controller route when Flutter uses the canonical paths listed above.
- React client `customServiceRequest.ts` currently includes `/client` in paths even though the axios base defaults to `/api/client`; the actual extracted React calls are `/api/client/client/custom-service-requests...` and have no matching backend route. The separate `/api/client/custom-service-requests...` rows are canonical Flutter/backend paths.
- React client `home.ts` calls `/home/works` and `/home/works/:id`; backend routes are `/api/client/works` and `/api/client/works/:id`, already represented by `works.ts`.
- React client `design.ts` has quote action calls (`quote-request`, `accept-quote`, `reject-quote`) with no matching backend routes.
- React technician `orders.ts` calls `PATCH /api/technician/orders/:id`, but the backend technician orders controller has no generic `@Patch(':id')` route.
- Technician custom-service-request backend routes exist and are required for Flutter MVP, but no current technician React service wrapper was found in `technician-frontend/src/services/*.ts`.
