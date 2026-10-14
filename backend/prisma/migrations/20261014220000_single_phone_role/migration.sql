CREATE TRIGGER "ClientUser_single_phone_role_insert"
BEFORE INSERT ON "ClientUser"
WHEN NEW.status != 'deleted' AND EXISTS (
  SELECT 1 FROM "Technician" WHERE status != 'deleted'
  AND (CASE WHEN phone LIKE '+86%' THEN substr(phone, 4) ELSE phone END)
    = (CASE WHEN NEW.phone LIKE '+86%' THEN substr(NEW.phone, 4) ELSE NEW.phone END)
)
BEGIN
  SELECT RAISE(ABORT, 'PHONE_ALREADY_REGISTERED');
END;

CREATE TRIGGER "ClientUser_single_phone_role_update"
BEFORE UPDATE OF phone, status ON "ClientUser"
WHEN NEW.status != 'deleted' AND EXISTS (
  SELECT 1 FROM "Technician" WHERE status != 'deleted'
  AND (CASE WHEN phone LIKE '+86%' THEN substr(phone, 4) ELSE phone END)
    = (CASE WHEN NEW.phone LIKE '+86%' THEN substr(NEW.phone, 4) ELSE NEW.phone END)
)
BEGIN
  SELECT RAISE(ABORT, 'PHONE_ALREADY_REGISTERED');
END;

CREATE TRIGGER "Technician_single_phone_role_insert"
BEFORE INSERT ON "Technician"
WHEN NEW.status != 'deleted' AND EXISTS (
  SELECT 1 FROM "ClientUser" WHERE status != 'deleted'
  AND (CASE WHEN phone LIKE '+86%' THEN substr(phone, 4) ELSE phone END)
    = (CASE WHEN NEW.phone LIKE '+86%' THEN substr(NEW.phone, 4) ELSE NEW.phone END)
)
BEGIN
  SELECT RAISE(ABORT, 'PHONE_ALREADY_REGISTERED');
END;

CREATE TRIGGER "Technician_single_phone_role_update"
BEFORE UPDATE OF phone, status ON "Technician"
WHEN NEW.status != 'deleted' AND EXISTS (
  SELECT 1 FROM "ClientUser" WHERE status != 'deleted'
  AND (CASE WHEN phone LIKE '+86%' THEN substr(phone, 4) ELSE phone END)
    = (CASE WHEN NEW.phone LIKE '+86%' THEN substr(NEW.phone, 4) ELSE NEW.phone END)
)
BEGIN
  SELECT RAISE(ABORT, 'PHONE_ALREADY_REGISTERED');
END;
