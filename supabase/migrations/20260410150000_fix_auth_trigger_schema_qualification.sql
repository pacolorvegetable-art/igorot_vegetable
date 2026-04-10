create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    user_role text;
    user_name text;
    user_email text;
    user_phone text;
begin
    user_role := coalesce(new.raw_user_meta_data->>'role', 'customer');
    user_name := coalesce(new.raw_user_meta_data->>'full_name', '');
    user_email := new.email;
    user_phone := nullif(btrim(coalesce(new.raw_user_meta_data->>'phone', '')), '');

    if user_role = 'staff' then
        insert into public.seller (id, name, email, phone)
        values (new.id, user_name, user_email, user_phone);
    else
        insert into public.customer (id, name, email, phone)
        values (new.id, user_name, user_email, user_phone);
    end if;

    return new;
end;
$$;
