CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
    user_email TEXT;
    user_phone TEXT;
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    user_email := NEW.email;
    user_phone := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');

    IF user_role = 'staff' THEN
        INSERT INTO seller (id, name, email, phone)
        VALUES (NEW.id, user_name, user_email, user_phone);
    ELSE
        INSERT INTO customer (id, name, email, phone)
        VALUES (NEW.id, user_name, user_email, user_phone);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
