-- Migration: Add order tracking support
-- Date: 2026-04-07
-- Purpose: Allow anonymous users to track orders by phone number

-- Add delivery_address field if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_address TEXT;

-- Update status constraint to include delivery statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'));

-- Add policy for anonymous users to read orders by phone number
DROP POLICY IF EXISTS "Anyone can view orders by phone" ON orders;
CREATE POLICY "Anyone can view orders by phone"
    ON orders FOR SELECT
    TO anon, authenticated
    USING (customer_phone IS NOT NULL);

-- Add policy for anonymous users to read order items for orders they can see
DROP POLICY IF EXISTS "Anyone can view order items by phone" ON order_item;
CREATE POLICY "Anyone can view order items by phone"
    ON order_item FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_item.order_id 
            AND orders.customer_phone IS NOT NULL
        )
    );

-- Add index on customer_phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
