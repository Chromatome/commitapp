// Supabase Edge Function: demo-login
//
// Showcase-only helper for the "Get Started" button on the landing page.
// Mints a one-time login token for a fixed demo account so visitors can
// jump straight into the app with no credentials of their own.
//
// This runs with the service-role key, which must never be shipped to the
// browser, so it has to live server-side as an Edge Function.
//
// Setup:
//   1. Create (or pick) the account you want visitors to land in, and note
//      its email address.
//   2. Deploy this function:
//        supabase functions deploy demo-login
//   3. Set the demo account's email as a secret (do NOT hardcode it here):
//        supabase secrets set DEMO_USER_EMAIL=demo@yourdomain.com
//      SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided
//      automatically by the Edge Runtime — no need to set those yourself.
//
// The function never returns a password. It returns a short-lived
// "hashed_token" from `auth.admin.generateLink`, which the client
// immediately exchanges for a session via `supabase.auth.verifyOtp`
// (see src/lib/auth.ts -> logInAsDemoUser). This is the same mechanism
// Supabase's own magic-link emails use.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const demoEmail = Deno.env.get("DEMO_USER_EMAIL");
    if (!demoEmail) {
      return new Response(
        JSON.stringify({
          error:
            "DEMO_USER_EMAIL secret is not set. Run: supabase secrets set DEMO_USER_EMAIL=<email>",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: demoEmail,
    });

    if (error || !data?.properties?.hashed_token) {
      return new Response(
        JSON.stringify({ error: error?.message ?? "Could not create a demo session." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        email: demoEmail,
        hashed_token: data.properties.hashed_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
