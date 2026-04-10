-- ============================================================
--  Fix RLS Infinite Recursion
--  The original policies queried the seller table to check if a user
--  is a seller, which caused infinite recursion when reading from seller.
--  
--  Solution: Use auth.jwt() to check the role from user metadata instead.
-- ============================================================

-- Helper function to check if the current user is a seller (staff)
-- This avoids querying the seller table and prevents infinite recursion
CREATE OR REPLACE FUNCTION is_seller()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'staff',
        FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
--  Drop and recreate problematic policies
-- ============================================================

-- Drop seller policies that cause recursion
DROP POLICY IF EXISTS "Sellers can view all sellers" ON seller;

-- Recreate seller policy using the helper function
CREATE POLICY "Sellers can view all sellers" ON seller
    FOR SELECT USING (
        auth.uid() = id OR is_seller()
    );

-- Drop and recreate customer policies
DROP POLICY IF EXISTS "Sellers can view all customers" ON customer;

CREATE POLICY "Sellers can view all customers" ON customer
    FOR SELECT USING (is_seller());

-- Drop and recreate product policies
DROP POLICY IF EXISTS "Sellers can view all products" ON product;
DROP POLICY IF EXISTS "Sellers can insert products" ON product;
DROP POLICY IF EXISTS "Sellers can update products" ON product;
DROP POLICY IF EXISTS "Sellers can delete products" ON product;

CREATE POLICY "Sellers can view all products" ON product
    FOR SELECT USING (is_seller());

CREATE POLICY "Sellers can insert products" ON product
    FOR INSERT WITH CHECK (is_seller());

CREATE POLICY "Sellers can update products" ON product
    FOR UPDATE USING (is_seller());

CREATE POLICY "Sellers can delete products" ON product
    FOR DELETE USING (is_seller());

-- Drop and recreate cart policies
DROP POLICY IF EXISTS "Sellers can view all carts" ON cart;

CREATE POLICY "Sellers can view all carts" ON cart
    FOR SELECT USING (is_seller());

-- Drop and recreate cart_item policies
DROP POLICY IF EXISTS "Sellers can view all cart items" ON cart_item;

CREATE POLICY "Sellers can view all cart items" ON cart_item
    FOR SELECT USING (is_seller());
