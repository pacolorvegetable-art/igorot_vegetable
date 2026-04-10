-- ============================================================
--  E-Commerce Schema with Supabase Auth Integration
--  Tables: customer, seller, product, cart, cart_item
-- ============================================================

-- 1. customer (linked to auth.users for customer role)
CREATE TABLE customer (
    id          UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        VARCHAR(100),
    email       VARCHAR(150)  NOT NULL UNIQUE,
    phone       VARCHAR(20),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. seller (linked to auth.users for staff/management role)
CREATE TABLE seller (
    id          UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        VARCHAR(100),
    email       VARCHAR(150)  NOT NULL UNIQUE,
    phone       VARCHAR(20),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. product (owned by seller)
CREATE TABLE product (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150)   NOT NULL,
    description     TEXT,
    weight          NUMERIC(10,3),              -- kg
    price           NUMERIC(12,2)  NOT NULL,    -- base price in PHP
    stock_quantity  INTEGER        DEFAULT 0,
    unit            VARCHAR(20)    DEFAULT 'kg',
    image_url       TEXT,
    is_available    BOOLEAN        DEFAULT true,
    time_of_harvest TIMESTAMP WITH TIME ZONE,
    seller_id       UUID           NOT NULL REFERENCES seller(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. cart (owned by customer)
CREATE TABLE cart (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID        NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'checked_out', 'cancelled')),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. cart_item (junction: cart ↔ product)
CREATE TABLE cart_item (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id     UUID           NOT NULL REFERENCES cart(id) ON DELETE CASCADE,
    product_id  UUID           NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
    quantity    INTEGER        NOT NULL CHECK (quantity > 0),
    price       NUMERIC(12,2)  NOT NULL,   -- snapshot of price at time of add
    added_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (cart_id, product_id)           -- one row per product per cart
);

-- ============================================================
--  Indexes
-- ============================================================
CREATE INDEX idx_product_seller    ON product(seller_id);
CREATE INDEX idx_product_available ON product(is_available);
CREATE INDEX idx_cart_customer     ON cart(customer_id);
CREATE INDEX idx_cart_status       ON cart(status);
CREATE INDEX idx_cart_item_cart    ON cart_item(cart_id);
CREATE INDEX idx_cart_item_product ON cart_item(product_id);

-- ============================================================
--  Row Level Security (RLS) Policies
-- ============================================================

-- Enable RLS
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_item ENABLE ROW LEVEL SECURITY;

-- Customer policies
CREATE POLICY "Customers can view own profile" ON customer
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Customers can update own profile" ON customer
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Sellers can view all customers" ON customer
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM seller WHERE id = auth.uid())
    );

-- Seller policies
CREATE POLICY "Sellers can view own profile" ON seller
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Sellers can update own profile" ON seller
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Sellers can view all sellers" ON seller
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM seller WHERE id = auth.uid())
    );

-- Product policies
CREATE POLICY "Anyone can view available products" ON product
    FOR SELECT USING (is_available = true);

CREATE POLICY "Sellers can view all products" ON product
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM seller WHERE id = auth.uid())
    );

CREATE POLICY "Sellers can insert products" ON product
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM seller WHERE id = auth.uid())
    );

CREATE POLICY "Sellers can update products" ON product
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM seller WHERE id = auth.uid())
    );

CREATE POLICY "Sellers can delete products" ON product
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM seller WHERE id = auth.uid())
    );

-- Cart policies
CREATE POLICY "Customers can view own cart" ON cart
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create own cart" ON cart
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own cart" ON cart
    FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Sellers can view all carts" ON cart
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM seller WHERE id = auth.uid())
    );

-- Cart item policies
CREATE POLICY "Customers can view own cart items" ON cart_item
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cart 
            WHERE cart.id = cart_item.cart_id AND cart.customer_id = auth.uid()
        )
    );

CREATE POLICY "Customers can insert own cart items" ON cart_item
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM cart 
            WHERE cart.id = cart_item.cart_id AND cart.customer_id = auth.uid()
        )
    );

CREATE POLICY "Customers can update own cart items" ON cart_item
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM cart 
            WHERE cart.id = cart_item.cart_id AND cart.customer_id = auth.uid()
        )
    );

CREATE POLICY "Customers can delete own cart items" ON cart_item
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM cart 
            WHERE cart.id = cart_item.cart_id AND cart.customer_id = auth.uid()
        )
    );

CREATE POLICY "Sellers can view all cart items" ON cart_item
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM seller WHERE id = auth.uid())
    );

-- ============================================================
--  Functions & Triggers
-- ============================================================

-- Function to handle new user signup (create customer or seller based on role)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
    user_email TEXT;
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    user_email := NEW.email;
    
    IF user_role = 'staff' THEN
        INSERT INTO seller (id, name, email)
        VALUES (NEW.id, user_name, user_email);
    ELSE
        INSERT INTO customer (id, name, email)
        VALUES (NEW.id, user_name, user_email);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create customer/seller on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_product_updated_at
    BEFORE UPDATE ON product
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cart_updated_at
    BEFORE UPDATE ON cart
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
--  Storage Bucket Setup (run separately in Supabase Dashboard)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
-- 
-- CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
-- CREATE POLICY "Sellers can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM seller WHERE id = auth.uid()));
-- CREATE POLICY "Sellers can update product images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM seller WHERE id = auth.uid()));
-- CREATE POLICY "Sellers can delete product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM seller WHERE id = auth.uid()));