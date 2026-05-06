-- Add configurable quantity basis for product pricing.
-- Example: price=120, unit='kg', price_basis_quantity=3 means ₱120 per 3 kg.

ALTER TABLE product
ADD COLUMN IF NOT EXISTS price_basis_quantity NUMERIC(10,3) NOT NULL DEFAULT 1
CHECK (price_basis_quantity > 0);

UPDATE product
SET price_basis_quantity = 1
WHERE price_basis_quantity IS NULL OR price_basis_quantity <= 0;

COMMENT ON COLUMN product.price_basis_quantity IS 'Quantity of unit covered by price (e.g., 3 means price is for 3 units).';
