-- Migration: Fix anonymous access for orders
-- Date: 2026-04-07
-- Purpose: Ensure anonymous users can place orders from the public shop

-- Drop existing policies if they exist (to recreate them cleanly)
DROP POLICY IF EXISTS "Anyone can insert orders (for public checkout)" ON orders;
DROP POLICY IF EXISTS "Anyone can insert order items (for public checkout)" ON order_item;

-- Re-create policies for anonymous order creation
CREATE POLICY "Anyone can insert orders (for public checkout)"
    ON orders FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Anyone can insert order items (for public checkout)"
    ON order_item FOR INSERT
    TO anon
    WITH CHECK (true);

-- Also allow reading payment methods for anonymous users
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON payment_method;
CREATE POLICY "Anyone can view active payment methods"
    ON payment_method FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- Allow sellers to view ALL payment methods (including inactive)
DROP POLICY IF EXISTS "Sellers can view all payment methods" ON payment_method;
CREATE POLICY "Sellers can view all payment methods"
    ON payment_method FOR SELECT
    TO authenticated
    USING (is_seller());
