-- Migration: Add customer delivery address and signed-in customer checkout policies
-- Date: 2026-04-09

ALTER TABLE customer
ADD COLUMN IF NOT EXISTS delivery_address TEXT;

DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
CREATE POLICY "Customers can view own orders"
    ON orders FOR SELECT
    TO authenticated
    USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can insert own orders" ON orders;
CREATE POLICY "Customers can insert own orders"
    ON orders FOR INSERT
    TO authenticated
    WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can view own order items" ON order_item;
CREATE POLICY "Customers can view own order items"
    ON order_item FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM orders
            WHERE orders.id = order_item.order_id
              AND orders.customer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Customers can insert own order items" ON order_item;
CREATE POLICY "Customers can insert own order items"
    ON order_item FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM orders
            WHERE orders.id = order_item.order_id
              AND orders.customer_id = auth.uid()
        )
    );
