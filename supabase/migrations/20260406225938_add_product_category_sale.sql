-- Add category, sale_percent, and harvested_at to product table
-- Categories: 'fruits', 'highland_vegetables', 'lowland_vegetables'

ALTER TABLE product 
ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'highland_vegetables',
ADD COLUMN IF NOT EXISTS sale_percent INTEGER DEFAULT 0 CHECK (sale_percent >= 0 AND sale_percent <= 100),
ADD COLUMN IF NOT EXISTS harvested_at DATE;

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_product_category ON product(category);

-- Update existing products to have a default category
UPDATE product SET category = 'highland_vegetables' WHERE category IS NULL;

COMMENT ON COLUMN product.category IS 'Product category: fruits, highland_vegetables, lowland_vegetables';
COMMENT ON COLUMN product.sale_percent IS 'Sale discount percentage (0-100)';
COMMENT ON COLUMN product.harvested_at IS 'Date when the product was harvested';
