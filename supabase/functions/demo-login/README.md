# demo-login

Backs the "Get Started" button on the landing page: it signs the visitor
straight into a fixed showcase account with no credentials typed in.

## Why an Edge Function

Signing someone in as a specific user requires either their password or a
service-role call (`auth.admin.generateLink`). The service-role key can
never be shipped to the browser, so this has to run server-side.

The function itself never returns a password — it returns a short-lived
magic-link token, which the client exchanges for a session. Anyone who
calls this function only ever gets a session as the one demo account you
configure; it grants no other access.

## One-time setup

1. **Create the demo account** (or reuse an existing one) in Supabase Auth
   — e.g. `demo@yourdomain.com`. Set up whatever profile/data you want
   showcase visitors to see (username, sample commissions, etc).

2. **Deploy the function** (from the project root, with the Supabase CLI
   installed and linked to your project):

   ```bash
   supabase functions deploy demo-login
   ```

3. **Set the demo account's email as a secret** — do not hardcode it in
   the source:

   ```bash
   supabase secrets set DEMO_USER_EMAIL=demo@yourdomain.com
   ```

   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected
   automatically by the Edge Runtime; you don't need to set those.

That's it — no client-side env vars needed. The "Get Started" button
already calls this function via `logInAsDemoUser()` in `src/lib/auth.ts`.

## Turning it off later

If you want "Get Started" to go back to the real signup flow, revert the
change to `src/pages/LandingPage.tsx` (swap the demo-login button back to
`<LinkButton label="Get Started" href="/login?mode=signup" ... />`). You
can leave this function deployed or remove it with
`supabase functions delete demo-login`.
