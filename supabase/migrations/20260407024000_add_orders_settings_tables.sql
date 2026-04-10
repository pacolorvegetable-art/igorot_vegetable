-- Migration: Add orders, settings, payment_methods, and operating_hours tables
-- Date: 2026-04-07

-- ============================================================================
-- ORDERS TABLE - For tracking customer orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID            REFERENCES customer(id) ON DELETE SET NULL,
    customer_name   VARCHAR(100),
    customer_phone  VARCHAR(20),
    customer_email  VARCHAR(150),
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
    total_amount    NUMERIC(12,2)   NOT NULL DEFAULT 0,
    payment_method  VARCHAR(50),
    payment_status  VARCHAR(20)     DEFAULT 'unpaid'
                                    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Order items (what products are in each order)
CREATE TABLE IF NOT EXISTS order_item (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      UUID            REFERENCES product(id) ON DELETE SET NULL,
    product_name    VARCHAR(150)    NOT NULL,
    quantity        NUMERIC(10,3)   NOT NULL CHECK (quantity > 0),
    unit            VARCHAR(20)     DEFAULT 'kg',
    unit_price      NUMERIC(12,2)   NOT NULL,
    total_price     NUMERIC(12,2)   NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SPOILAGE TABLE - For tracking product spoilage/losses
-- ============================================================================
CREATE TABLE IF NOT EXISTS spoilage (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID            REFERENCES product(id) ON DELETE SET NULL,
    product_name    VARCHAR(150)    NOT NULL,
    quantity        NUMERIC(10,3)   NOT NULL CHECK (quantity > 0),
    unit            VARCHAR(20)     DEFAULT 'kg',
    unit_price      NUMERIC(12,2)   NOT NULL,
    total_loss      NUMERIC(12,2)   NOT NULL,
    reason          TEXT,
    recorded_by     UUID            REFERENCES seller(id) ON DELETE SET NULL,
    recorded_at     DATE            NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT METHODS TABLE - Store payment options (GCash, Maya, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_method (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    type            VARCHAR(50)     NOT NULL CHECK (type IN ('gcash', 'maya', 'bank', 'cod')),
    account_name    VARCHAR(100)    NOT NULL,
    account_number  VARCHAR(50)     NOT NULL,
    qr_code_url     TEXT,
    is_active       BOOLEAN         DEFAULT true,
    display_order   INTEGER         DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- OPERATING HOURS TABLE - Store operating hours per day
-- ============================================================================
CREATE TABLE IF NOT EXISTS operating_hours (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week     INTEGER         NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    day_name        VARCHAR(10)     NOT NULL,
    is_open         BOOLEAN         DEFAULT true,
    open_time       TIME,
    close_time      TIME,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(day_of_week)
);

-- Insert default operating hours (Mon=1 to Sun=0, following JS convention but stored as 0=Sun)
INSERT INTO operating_hours (day_of_week, day_name, is_open, open_time, close_time) VALUES
    (0, 'Sunday', false, NULL, NULL),
    (1, 'Monday', true, '08:00', '17:00'),
    (2, 'Tuesday', true, '08:00', '17:00'),
    (3, 'Wednesday', true, '08:00', '17:00'),
    (4, 'Thursday', true, '08:00', '17:00'),
    (5, 'Friday', true, '08:00', '17:00'),
    (6, 'Saturday', true, '08:00', '12:00')
ON CONFLICT (day_of_week) DO NOTHING;

-- ============================================================================
-- STORE SETTINGS TABLE - General store configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_settings (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(100)    NOT NULL UNIQUE,
    value           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_item_order ON order_item(order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_product ON order_item(product_id);
CREATE INDEX IF NOT EXISTS idx_spoilage_product ON spoilage(product_id);
CREATE INDEX IF NOT EXISTS idx_spoilage_recorded_at ON spoilage(recorded_at);
CREATE INDEX IF NOT EXISTS idx_payment_method_type ON payment_method(type);
CREATE INDEX IF NOT EXISTS idx_payment_method_active ON payment_method(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Orders RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view all orders"
    ON orders FOR SELECT
    TO authenticated
    USING (is_seller());

CREATE POLICY "Sellers can insert orders"
    ON orders FOR INSERT
    TO authenticated
    WITH CHECK (is_seller());

CREATE POLICY "Sellers can update orders"
    ON orders FOR UPDATE
    TO authenticated
    USING (is_seller());

CREATE POLICY "Anyone can insert orders (for public checkout)"
    ON orders FOR INSERT
    TO anon
    WITH CHECK (true);

-- Order Items RLS
ALTER TABLE order_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view all order items"
    ON order_item FOR SELECT
    TO authenticated
    USING (is_seller());

CREATE POLICY "Sellers can manage order items"
    ON order_item FOR ALL
    TO authenticated
    USING (is_seller());

CREATE POLICY "Anyone can insert order items (for public checkout)"
    ON order_item FOR INSERT
    TO anon
    WITH CHECK (true);

-- Spoilage RLS
ALTER TABLE spoilage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can manage spoilage"
    ON spoilage FOR ALL
    TO authenticated
    USING (is_seller());

-- Payment Methods RLS
ALTER TABLE payment_method ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active payment methods"
    ON payment_method FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Sellers can manage payment methods"
    ON payment_method FOR ALL
    TO authenticated
    USING (is_seller());

-- Operating Hours RLS
ALTER TABLE operating_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view operating hours"
    ON operating_hours FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Sellers can manage operating hours"
    ON operating_hours FOR ALL
    TO authenticated
    USING (is_seller());

-- Store Settings RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view store settings"
    ON store_settings FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Sellers can manage store settings"
    ON store_settings FOR ALL
    TO authenticated
    USING (is_seller());

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_method_updated_at
    BEFORE UPDATE ON payment_method
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operating_hours_updated_at
    BEFORE UPDATE ON operating_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at
    BEFORE UPDATE ON store_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
