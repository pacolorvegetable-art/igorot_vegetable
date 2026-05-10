-- Migration: Add real-time customer <-> seller messaging
-- Date: 2026-05-11

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id             UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    seller_id               UUID NOT NULL REFERENCES seller(id) ON DELETE CASCADE,
    customer_name           VARCHAR(100),
    seller_name             VARCHAR(100),
    last_message_preview    TEXT,
    last_message_sender_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_message_at         TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (customer_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_customer_last_message
    ON conversation(customer_id, last_message_at DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_seller_last_message
    ON conversation(seller_id, last_message_at DESC NULLS LAST, created_at DESC);

ALTER TABLE conversation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view conversations" ON conversation;
CREATE POLICY "Participants can view conversations"
    ON conversation FOR SELECT
    TO authenticated
    USING (
        auth.uid() = customer_id
        OR auth.uid() = seller_id
    );

DROP POLICY IF EXISTS "Participants can create conversations" ON conversation;
CREATE POLICY "Participants can create conversations"
    ON conversation FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.uid() = customer_id AND EXISTS (SELECT 1 FROM seller WHERE id = seller_id))
        OR
        (auth.uid() = seller_id AND EXISTS (SELECT 1 FROM customer WHERE id = customer_id))
    );

DROP POLICY IF EXISTS "Participants can update conversations" ON conversation;
CREATE POLICY "Participants can update conversations"
    ON conversation FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = customer_id
        OR auth.uid() = seller_id
    )
    WITH CHECK (
        auth.uid() = customer_id
        OR auth.uid() = seller_id
    );

-- ============================================================================
-- MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS message (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL CHECK (char_length(btrim(content)) > 0),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_message_conversation_created_at
    ON message(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_message_receiver_unread
    ON message(receiver_id, is_read, created_at DESC);

ALTER TABLE message ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON message;
CREATE POLICY "Participants can view messages"
    ON message FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM conversation
            WHERE conversation.id = message.conversation_id
              AND (
                conversation.customer_id = auth.uid()
                OR conversation.seller_id = auth.uid()
              )
        )
    );

DROP POLICY IF EXISTS "Participants can send messages" ON message;
CREATE POLICY "Participants can send messages"
    ON message FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1
            FROM conversation
            WHERE conversation.id = message.conversation_id
              AND (
                (conversation.customer_id = auth.uid() AND receiver_id = conversation.seller_id)
                OR
                (conversation.seller_id = auth.uid() AND receiver_id = conversation.customer_id)
              )
        )
    );

DROP POLICY IF EXISTS "Recipients can mark messages read" ON message;
CREATE POLICY "Recipients can mark messages read"
    ON message FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = receiver_id
        AND EXISTS (
            SELECT 1
            FROM conversation
            WHERE conversation.id = message.conversation_id
              AND (
                conversation.customer_id = auth.uid()
                OR conversation.seller_id = auth.uid()
              )
        )
    )
    WITH CHECK (
        auth.uid() = receiver_id
        AND EXISTS (
            SELECT 1
            FROM conversation
            WHERE conversation.id = message.conversation_id
              AND (
                conversation.customer_id = auth.uid()
                OR conversation.seller_id = auth.uid()
              )
        )
    );

-- ============================================================================
-- NOTIFICATIONS UPDATES FOR MESSAGE THREAD DEEP LINKS
-- ============================================================================
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversation(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id
    ON notifications(conversation_id);

DROP POLICY IF EXISTS "Sellers can view notifications" ON notifications;
CREATE POLICY "Sellers can view notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (
        is_seller()
        AND recipient_role = 'staff'
        AND (
            recipient_user_id IS NULL
            OR recipient_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Sellers can update notifications" ON notifications;
CREATE POLICY "Sellers can update notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (
        is_seller()
        AND recipient_role = 'staff'
        AND (
            recipient_user_id IS NULL
            OR recipient_user_id = auth.uid()
        )
    )
    WITH CHECK (
        is_seller()
        AND recipient_role = 'staff'
        AND (
            recipient_user_id IS NULL
            OR recipient_user_id = auth.uid()
        )
    );

-- ============================================================================
-- FUNCTIONS + TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION populate_conversation_participant_names()
RETURNS TRIGGER AS $$
DECLARE
    resolved_customer_name TEXT;
    resolved_seller_name TEXT;
BEGIN
    SELECT name INTO resolved_customer_name
    FROM customer
    WHERE customer.id = NEW.customer_id;

    SELECT name INTO resolved_seller_name
    FROM seller
    WHERE seller.id = NEW.seller_id;

    NEW.customer_name := COALESCE(NULLIF(btrim(resolved_customer_name), ''), 'Customer');
    NEW.seller_name := COALESCE(NULLIF(btrim(resolved_seller_name), ''), 'Seller');
    NEW.updated_at := NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION ensure_message_update_is_read_only()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
       OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Only read state can be updated on messages.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION sync_conversation_after_message_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversation
    SET
        last_message_preview = LEFT(NEW.content, 180),
        last_message_sender_id = NEW.sender_id,
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    convo RECORD;
    sender_display_name TEXT;
BEGIN
    SELECT
        id,
        customer_id,
        seller_id,
        customer_name,
        seller_name
    INTO convo
    FROM conversation
    WHERE conversation.id = NEW.conversation_id;

    IF convo.id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.sender_id = convo.customer_id THEN
        sender_display_name := COALESCE(NULLIF(btrim(convo.customer_name), ''), 'Customer');

        INSERT INTO notifications (
            title,
            message,
            recipient_role,
            recipient_user_id,
            conversation_id
        )
        VALUES (
            'New message',
            sender_display_name || ' sent you a new message',
            'staff',
            convo.seller_id,
            convo.id
        );
    ELSIF NEW.sender_id = convo.seller_id THEN
        sender_display_name := COALESCE(NULLIF(btrim(convo.seller_name), ''), 'Seller');

        INSERT INTO notifications (
            title,
            message,
            recipient_role,
            recipient_user_id,
            conversation_id
        )
        VALUES (
            'New message',
            sender_display_name || ' replied to your message',
            'customer',
            convo.customer_id,
            convo.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_conversation_set_participant_names ON conversation;
CREATE TRIGGER on_conversation_set_participant_names
BEFORE INSERT OR UPDATE OF customer_id, seller_id ON conversation
FOR EACH ROW
EXECUTE FUNCTION populate_conversation_participant_names();

DROP TRIGGER IF EXISTS on_message_read_state_guard ON message;
CREATE TRIGGER on_message_read_state_guard
BEFORE UPDATE ON message
FOR EACH ROW
EXECUTE FUNCTION ensure_message_update_is_read_only();

DROP TRIGGER IF EXISTS on_message_sync_conversation ON message;
CREATE TRIGGER on_message_sync_conversation
AFTER INSERT ON message
FOR EACH ROW
EXECUTE FUNCTION sync_conversation_after_message_insert();

DROP TRIGGER IF EXISTS on_message_create_notification ON message;
CREATE TRIGGER on_message_create_notification
AFTER INSERT ON message
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_message();

-- Keep conversation.updated_at current on direct updates.
DROP TRIGGER IF EXISTS update_conversation_updated_at ON conversation;
CREATE TRIGGER update_conversation_updated_at
BEFORE UPDATE ON conversation
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'conversation'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE conversation;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'message'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE message;
    END IF;
END
$$;
