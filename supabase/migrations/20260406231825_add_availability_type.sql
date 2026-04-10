-- Add availability_type column to product table
-- Values: 'on_hand' or 'pre_order'

ALTER TABLE product 
ADD COLUMN IF NOT EXISTS availability_type VARCHAR(20) DEFAULT 'on_hand' CHECK (availability_type IN ('on_hand', 'pre_order'));

-- Set existing products based on stock_quantity
UPDATE product SET availability_type = 'on_hand' WHERE stock_quantity > 0;
UPDATE product SET availability_type = 'pre_order' WHERE stock_quantity = 0;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_product_availability_type ON product(availability_type);

COMMENT ON COLUMN product.availability_type IS 'Product availability: on_hand (ready to ship) or pre_order (harvest on demand)';
