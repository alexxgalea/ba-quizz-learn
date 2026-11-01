-- Referințele de schelet pentru modulul postgres.
-- Fiecare secțiune „=== s-… ===” ajunge în aplicație
-- (build.mjs); testele sunt în test_skel_pg.py.

-- === s-postgres-upsert ===
INSERT INTO stock (sku, qty, updated_at)
VALUES ('A-1', 5, now())
ON CONFLICT (sku) DO UPDATE
SET qty = stock.qty + EXCLUDED.qty,
    updated_at = now()
RETURNING sku, qty;
-- === end ===

-- === s-postgres-window ===
SELECT customer, id, amount,
       amount - prev AS delta
FROM (
  SELECT customer, id, amount,
    LAG(amount) OVER (
      PARTITION BY customer
      ORDER BY created_at, id
    ) AS prev,
    ROW_NUMBER() OVER (
      PARTITION BY customer
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM orders
) t
WHERE rn = 1
ORDER BY customer;
-- === end ===

-- === s-postgres-queue ===
UPDATE jobs
SET status = 'running', started_at = now()
WHERE id = (
  SELECT id FROM jobs
  WHERE status = 'new'
  ORDER BY id
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING id, payload;
-- === end ===
