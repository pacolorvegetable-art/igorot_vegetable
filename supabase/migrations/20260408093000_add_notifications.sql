-- Migration: Add notifications table and auto-create notification on new orders
-- Date: 2026-04-08

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message     TEXT,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view notifications" ON notifications;
CREATE POLICY "Sellers can view notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (is_seller());

DROP POLICY IF EXISTS "Sellers can update notifications" ON notifications;
CREATE POLICY "Sellers can update notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (is_seller())
    WITH CHECK (is_seller());

-- ============================================================================
-- FUNCTION + TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (message)
    VALUES ('New order received #' || NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_new_order ON orders;
CREATE TRIGGER on_new_order
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION notify_new_order();

-- ============================================================================
-- REALTIME
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END
$$;
