# Flutter Coexistence Regression Matrix

## Test Matrix

| Flow | React Client ↔ React Tech | React Client ↔ Flutter Tech | Flutter Client ↔ React Tech | Flutter Client ↔ Flutter Tech |
|------|:---:|:---:|:---:|:---:|
| Invite / Register / Bind | ☐ | ☐ | ☐ | ☐ |
| Login / Logout | ☐ | ☐ | ☐ | ☐ |
| Create Booking | ☐ | ☐ | ☐ | ☐ |
| Quote / Accept / Confirm / Complete | ☐ | ☐ | ☐ | ☐ |
| Design Upload / Quote / Order | ☐ | ☐ | ☐ | ☐ |
| Chat Text / Image / Read / Typing | ☐ | ☐ | ☐ | ☐ |
| Works Upload / Browse / Comment | ☐ | ☐ | ☐ | ☐ |
| Address Create / Default | ☐ | ☐ | ☐ | ☐ |
| Push Notification (Foreground) | N/A | ☐ | ☐ | ☐ |
| Push Notification (Background) | N/A | ☐ | ☐ | ☐ |
| Deep Link Invite (App Installed) | N/A | N/A | ☐ | ☐ |
| Deep Link Invite (App Not Installed) | ☐ | ☐ | N/A | N/A |

## Flows

### Invite / Register / Bind
1. Technician generates invite link in React WebApp
2. Client opens invite link
3. Client registers with phone + code + invite code
4. Client is bound to technician
5. Verify: client appears in technician's customer list (both React and Flutter)

### Login / Logout
1. Existing user logs in with phone + code
2. Token stored securely per role
3. Logout clears only active role token
4. Switching role preserves other role's session

### Create Booking
1. Client selects technician, service type, address, date/time
2. Order created with status `pending_quote`
3. Verify: order appears in technician's order list (both React and Flutter)

### Quote / Accept / Confirm / Complete
1. Technician reviews order and submits quote (price, date, time)
2. Client sees quoted order with price
3. Client accepts quote → status `pending_confirm`
4. Technician confirms → status `pending_home` or `pending_shop`
5. Technician completes → status `completed`
6. Verify: status updates visible in both React and Flutter at each step

### Design Upload / Quote / Order
1. Client uploads images and creates design request
2. Technician sees design and submits quote
3. Client accepts/rejects quote
4. Client creates order from design
5. Verify: images visible in both clients, quote flow works end-to-end

### Chat Text / Image / Read / Typing
1. Client sends text message → technician receives `message:new`
2. Technician sends text message → client receives `message:new`
3. Client sends image → technician receives image
4. Technician marks as read → client receives `message:read`
5. Client types → technician receives `typing:start` / `typing:stop`
6. Verify: messages appear in both React and Flutter conversation lists

### Works Upload / Browse / Comment
1. Technician uploads work with images in Flutter
2. Client sees work in React home page and works list
3. Client likes / favorites work
4. Client comments on work
5. Verify: like count, favorite status, comments visible in both clients

### Address Create / Default
1. Client creates address with contact name, phone, city, district, detail
2. Client sets default address
3. Default address auto-selected in booking flow
4. Verify: address visible in both React and Flutter

### Push Notification
1. Technician sends quote → client receives push notification
2. Client creates booking → technician receives push notification
3. New chat message → both receive push notification
4. Foreground: notification handled in-app
5. Background: notification opens correct screen

### Deep Link Invite
1. App installed: invite link opens Flutter invite flow
2. App not installed: invite link opens React WebApp invite flow
3. Verify: invite_code and tech_id parameters correctly parsed

## Execution Notes

- Run all tests against local/staging backend
- Use separate test accounts for client and technician
- Clear app data between test runs
- Test on both iOS and Android for Flutter client
