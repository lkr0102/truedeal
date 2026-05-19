-- Fix handle_new_user trigger to correctly read Google OAuth metadata.
-- Google sends full_name/name/picture, not display_name — the old trigger
-- left all Google users with display_name='Usuário' and no avatar.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'Usuário'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill existing Google users that got default values
UPDATE public.profiles p
SET
  display_name = coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    p.display_name
  ),
  avatar_url = coalesce(
    p.avatar_url,
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  )
FROM auth.users u
WHERE u.id = p.id
  AND u.raw_app_meta_data->>'provider' = 'google'
  AND (p.display_name = 'Usuário' OR p.avatar_url IS NULL);
