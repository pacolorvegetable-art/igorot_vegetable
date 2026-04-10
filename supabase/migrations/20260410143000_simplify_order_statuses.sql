-- Migration: Simplify order statuses for management workflow
-- Date: 2026-04-10

-- ============================================================================
-- NORMALIZE EXISTING ORDER STATUSES
-- ============================================================================
UPDATE orders
SET status = 'confirmed'
WHERE status IN ('preparing', 'ready', 'out_for_delivery', 'delivered', 'completed');

UPDATE orders
SET status = 'rejected'
WHERE status = 'cancelled';

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders
ADD CONSTRAINT orders_status_check
CHECK (status IN ('pending', 'confirmed', 'rejected'));

-- ============================================================================
-- RLS
-- ============================================================================
DROP POLICY IF EXISTS "Sellers can delete orders" ON orders;
CREATE POLICY "Sellers can delete orders"
    ON orders FOR DELETE
    TO authenticated
    USING (is_seller());

-- ============================================================================
-- CUSTOMER NOTIFICATIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_customer_order_updates()
RETURNS TRIGGER AS $$
DECLARE
    short_order_id TEXT;
BEGIN
    IF NEW.customer_id IS NULL THEN
        RETURN NEW;
    END IF;

    short_order_id := LEFT(NEW.id::text, 8);

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'confirmed' THEN
            INSERT INTO notifications (title, message, order_id, recipient_role, recipient_user_id)
            VALUES (
                'Order confirmed',
                'Your order #' || short_order_id || ' has been confirmed.',
                NEW.id,
                'customer',
                NEW.customer_id
            );
        ELSIF NEW.status = 'rejected' THEN
            INSERT INTO notifications (title, message, order_id, recipient_role, recipient_user_id)
            VALUES (
                'Order rejected',
                'Your order #' || short_order_id || ' has been rejected.',
                NEW.id,
                'customer',
                NEW.customer_id
            );
        END IF;
    END IF;

    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
        INSERT INTO notifications (title, message, order_id, recipient_role, recipient_user_id)
        VALUES (
            'Payment status updated',
            'Payment for order #' || short_order_id || ' is now ' || initcap(COALESCE(NEW.payment_status, 'unpaid')) || '.',
            NEW.id,
            'customer',
            NEW.customer_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
