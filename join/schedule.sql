-- Daily 22:00 (Europe/Rome) tester email for the Sudoku closed test.
-- Run once in the Supabase SQL Editor, AFTER:
--   1. the migration waitlist_tester_notify (tester_added_at, notified_at, pg_cron, pg_net) is applied
--   2. the Edge Function send-waitlist-email is deployed
--   3. the secret CRON_SECRET is set on the function AND stored in Vault below
--
-- Store the same value in Vault (replace the placeholder; do not commit the real value):
--   select vault.create_secret('<CRON_SECRET value>', 'waitlist_cron_secret');
--
-- pg_cron runs hourly; the job only calls the function when the Rome hour is 22.
-- Each address is sent once, because the function sets notified_at after Resend accepts it.

select cron.schedule(
  'send-waitlist-email-22h-rome',
  '0 * * * *',
  $$
  do $job$
  begin
    if extract(hour from (now() at time zone 'Europe/Rome')) = 22 then
      perform net.http_post(
        url     := 'https://ixzpabklrdngbxsdlwby.supabase.co/functions/v1/send-waitlist-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'waitlist_cron_secret')
        ),
        body    := '{}'::jsonb
      );
    end if;
  end
  $job$;
  $$
);

-- To stop the schedule later:  select cron.unschedule('send-waitlist-email-22h-rome');
-- To mark a tester (run by hand when they are added in Play Console):
--   update public.waitlist set tester_added_at = now() where email = 'someone@gmail.com';
