-- Standardize product categories to: vegetables, fruits, others
-- Maps legacy values:
-- - highland_vegetables -> vegetables
-- - lowland_vegetables -> vegetables
-- - NULL/empty -> vegetables
-- - unknown values -> others

UPDATE product
SET category = CASE
  WHEN category IS NULL OR BTRIM(category) = '' THEN 'vegetables'
  WHEN category IN ('highland_vegetables', 'lowland_vegetables') THEN 'vegetables'
  WHEN category = 'fruits' THEN 'fruits'
  WHEN category = 'vegetables' THEN 'vegetables'
  WHEN category = 'others' THEN 'others'
  ELSE 'others'
END;

ALTER TABLE product
ALTER COLUMN category SET DEFAULT 'vegetables';

COMMENT ON COLUMN product.category IS 'Product category: vegetables, fruits, others';
