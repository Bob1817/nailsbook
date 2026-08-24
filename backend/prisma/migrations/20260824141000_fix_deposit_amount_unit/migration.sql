-- depositAmount is stored in yuan. A previous mini-program build submitted cents,
-- producing values such as 5000 for a ¥50 deposit. Only repair rows that violate
-- the invariant that a deposit cannot exceed the quoted total, while the /100
-- value is valid within that total.
UPDATE "Order"
SET "depositAmount" = "depositAmount" / 100.0
WHERE "quotePrice" > 0
  AND "depositAmount" > "quotePrice"
  AND "depositAmount" / 100.0 <= "quotePrice";

-- Keep an already-created trade snapshot aligned with the repaired booking.
UPDATE "BookingTradeOrder"
SET "depositAmount" = (
      SELECT COALESCE("Order"."depositAmount", 0)
      FROM "Order"
      WHERE "Order"."id" = "BookingTradeOrder"."bookingId"
    ),
    "balanceAmount" = MAX(
      0,
      "totalAmount" - (
        SELECT COALESCE("Order"."depositAmount", 0)
        FROM "Order"
        WHERE "Order"."id" = "BookingTradeOrder"."bookingId"
      )
    )
WHERE EXISTS (
  SELECT 1
  FROM "Order"
  WHERE "Order"."id" = "BookingTradeOrder"."bookingId"
    AND "BookingTradeOrder"."depositAmount" > "Order"."depositAmount"
);
