-- Migration: Add revenue tracking derived from confirmed + paid orders
-- Date: 2026-04-11

-- ============================================================================
-- REVENUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS revenue (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID            NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    amount           NUMERIC(12,2)   NOT NULL CHECK (amount >= 0),
    revenue_month    DATE            NOT NULL,
    recognized_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenue_month ON revenue(revenue_month);
CREATE INDEX IF NOT EXISTS idx_revenue_order_id ON revenue(order_id);

ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view revenue" ON revenue;
CREATE POLICY "Sellers can view revenue"
    ON revenue FOR SELECT
    TO authenticated
    USING (is_seller());

DROP POLICY IF EXISTS "Sellers can manage revenue" ON revenue;
CREATE POLICY "Sellers can manage revenue"
    ON revenue FOR ALL
    TO authenticated
    USING (is_seller());

-- ============================================================================
-- TRIGGER FUNCTION: Sync one revenue row per order when order is confirmed + paid
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_revenue_from_order()
RETURNS TRIGGER AS $$
DECLARE
    qualifies BOOLEAN;
    recognized_at_value TIMESTAMP WITH TIME ZONE;
BEGIN
    qualifies := (NEW.status = 'confirmed' AND NEW.payment_status = 'paid');
    recognized_at_value := COALESCE(NEW.updated_at, NEW.created_at, NOW());

    IF qualifies THEN
        INSERT INTO revenue (order_id, amount, revenue_month, recognized_at)
        VALUES (
            NEW.id,
            COALESCE(NEW.total_amount, 0),
            DATE_TRUNC('month', recognized_at_value)::date,
            recognized_at_value
        )
        ON CONFLICT (order_id)
        DO UPDATE SET
            amount = EXCLUDED.amount,
            revenue_month = EXCLUDED.revenue_month,
            recognized_at = EXCLUDED.recognized_at,
            updated_at = NOW();
    ELSE
        DELETE FROM revenue
        WHERE order_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_revenue_on_order_change ON orders;
CREATE TRIGGER sync_revenue_on_order_change
    AFTER INSERT OR UPDATE OF status, payment_status, total_amount, updated_at ON orders
    FOR EACH ROW
    EXECUTE FUNCTION sync_revenue_from_order();

-- Keep revenue.updated_at fresh whenever a row changes directly.
DROP TRIGGER IF EXISTS update_revenue_updated_at ON revenue;
CREATE TRIGGER update_revenue_updated_at
    BEFORE UPDATE ON revenue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- BACKFILL EXISTING QUALIFIED ORDERS
-- ============================================================================
INSERT INTO revenue (order_id, amount, revenue_month, recognized_at)
SELECT
    orders.id,
    COALESCE(orders.total_amount, 0),
    DATE_TRUNC('month', COALESCE(orders.updated_at, orders.created_at, NOW()))::date,
    COALESCE(orders.updated_at, orders.created_at, NOW())
FROM orders
WHERE orders.status = 'confirmed'
  AND orders.payment_status = 'paid'
ON CONFLICT (order_id)
DO UPDATE SET
    amount = EXCLUDED.amount,
    revenue_month = EXCLUDED.revenue_month,
    recognized_at = EXCLUDED.recognized_at,
    updated_at = NOW();
