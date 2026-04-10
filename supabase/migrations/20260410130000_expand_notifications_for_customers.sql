-- Migration: Expand notifications for customer recipients and order deep links
-- Date: 2026-04-10

-- ============================================================================
-- NOTIFICATIONS TABLE UPDATES
-- ============================================================================
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS order_id UUID;

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS recipient_role TEXT NOT NULL DEFAULT 'staff';

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS recipient_user_id UUID;

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_recipient_role_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_recipient_role_check
CHECK (recipient_role IN ('staff', 'customer'));

UPDATE notifications
SET recipient_role = 'staff'
WHERE recipient_role IS NULL;

UPDATE notifications
SET order_id = (regexp_match(message, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})'))[1]::uuid
WHERE order_id IS NULL
  AND message ~* '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role_created_at
    ON notifications(recipient_role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_created_at
    ON notifications(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_order_id
    ON notifications(order_id);

-- ============================================================================
-- RLS
-- ============================================================================
DROP POLICY IF EXISTS "Sellers can view notifications" ON notifications;
CREATE POLICY "Sellers can view notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (is_seller() AND recipient_role = 'staff');

DROP POLICY IF EXISTS "Sellers can update notifications" ON notifications;
CREATE POLICY "Sellers can update notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (is_seller() AND recipient_role = 'staff')
    WITH CHECK (is_seller() AND recipient_role = 'staff');

DROP POLICY IF EXISTS "Customers can view own notifications" ON notifications;
CREATE POLICY "Customers can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (
        recipient_role = 'customer'
        AND recipient_user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Customers can update own notifications" ON notifications;
CREATE POLICY "Customers can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (
        recipient_role = 'customer'
        AND recipient_user_id = auth.uid()
    )
    WITH CHECK (
        recipient_role = 'customer'
        AND recipient_user_id = auth.uid()
    );

-- ============================================================================
-- HELPER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION format_order_status_label(status_value TEXT)
RETURNS TEXT AS $$
    SELECT NULLIF(initcap(replace(COALESCE(status_value, ''), '_', ' ')), '');
$$ LANGUAGE sql IMMUTABLE;

-- ============================================================================
-- FUNCTION + TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
DECLARE
    short_order_id TEXT;
BEGIN
    short_order_id := LEFT(NEW.id::text, 8);

    INSERT INTO notifications (title, message, order_id, recipient_role)
    VALUES (
        'New order received',
        'New order received #' || NEW.id::text,
        NEW.id,
        'staff'
    );

    IF NEW.customer_id IS NOT NULL THEN
        INSERT INTO notifications (title, message, order_id, recipient_role, recipient_user_id)
        VALUES (
            'Order placed',
            'Your order #' || short_order_id || ' has been placed successfully.',
            NEW.id,
            'customer',
            NEW.customer_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
        INSERT INTO notifications (title, message, order_id, recipient_role, recipient_user_id)
        VALUES (
            'Order status updated',
            'Your order #' || short_order_id || ' is now ' || format_order_status_label(NEW.status) || '.',
            NEW.id,
            'customer',
            NEW.customer_id
        );
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

DROP TRIGGER IF EXISTS on_new_order ON orders;
CREATE TRIGGER on_new_order
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION notify_new_order();

DROP TRIGGER IF EXISTS on_customer_order_update ON orders;
CREATE TRIGGER on_customer_order_update
AFTER UPDATE OF status, payment_status ON orders
FOR EACH ROW
WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
)
EXECUTE FUNCTION notify_customer_order_updates();
