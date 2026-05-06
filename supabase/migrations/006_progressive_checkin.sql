-- Atualiza o trigger de check-in para recompensas progressivas
-- Dia 1: 50 | Dia 2: 70 | Dia 3: 100 | Dia 4: 150 | Dia 5: 200 | Dia 6: 250 | Dia 7+: 300

create or replace function public.handle_checkin()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  yesterday      date    := current_date - 1;
  last_check     date;
  new_streak     integer;
  checkin_reward integer;
begin
  select date into last_check
  from public.daily_checkins
  where user_id = new.user_id and date = yesterday;

  select streak_days into new_streak
  from public.profiles where id = new.user_id;

  if last_check is not null then
    new_streak := new_streak + 1;
  else
    new_streak := 1;
  end if;

  update public.profiles
  set streak_days = new_streak, last_checkin = now()
  where id = new.user_id;

  -- Progressive daily reward
  checkin_reward := case
    when new_streak = 1 then 50
    when new_streak = 2 then 70
    when new_streak = 3 then 100
    when new_streak = 4 then 150
    when new_streak = 5 then 200
    when new_streak = 6 then 250
    else 300
  end;

  insert into public.tdp_transactions(user_id, amount, reason)
  values (new.user_id, checkin_reward, 'daily_checkin');

  -- Streak milestones (bonus on top of daily)
  if new_streak = 7 then
    insert into public.tdp_transactions(user_id, amount, reason)
    values (new.user_id, 150, 'streak_7d');
  end if;
  if new_streak = 30 then
    insert into public.tdp_transactions(user_id, amount, reason)
    values (new.user_id, 500, 'streak_30d');
  end if;

  return new;
end;
$$;
