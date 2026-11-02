-- Referința de schelet pentru modulul index.
-- Secțiunea „=== s-… ===” ajunge în aplicație
-- (build.mjs); testele sunt în test_skel_idx.py.

-- === s-index-concurrent ===
CREATE INDEX CONCURRENTLY idx_orders_open
ON orders (customer_id, created_at DESC)
WHERE status = 'open';

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders
WHERE customer_id = 42
  AND status = 'open'
ORDER BY created_at DESC
LIMIT 20;
-- === end ===
