// Supabase Edge Function: notify-swap-confirmed
//
// Triggered by a Postgres trigger (see
// supabase/migrations/20260918190000_notify_swap_confirmed.sql) the moment
// a swap's status transitions to 'confirmed'. Looks up both participants,
// the skill each taught the other, and sends each of them a confirmation
// email via Resend.
//
// This function is called server-to-server by the database (via pg_net),
// never by a browser, so it does NOT rely on Supabase's user-JWT
// verification (deployed with verify_jwt: false). Instead it checks a
// shared secret header set by the trigger against the WEBHOOK_SECRET
// environment variable, which only the database trigger and this function
// know. Never skip this check — without it, anyone who finds this
// function's URL could trigger emails for arbitrary swap ids.
//
// Required secrets (set with `supabase secrets set NAME=value`, or in the
// Dashboard under Edge Functions -> notify-swap-confirmed -> Secrets):
//   WEBHOOK_SECRET   - shared secret the trigger must present; required.
//   RESEND_API_KEY   - API key from resend.com; if unset, the function logs
//                       and returns 200 without sending, so deploying this
//                       before you have an email provider configured is
//                       safe and never breaks swap confirmation itself.
//   RESEND_FROM_EMAIL - optional; defaults to Resend's shared sandbox
//                       sender, which works immediately with no domain
//                       verification but is best replaced with your own
//                       verified sending address before real users see it.
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the platform for every Edge Function — they do not need to be set here.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface NotifyPayload {
  swap_id: string;
}

interface SkillRow {
  name: string;
}

interface ProfileRow {
  id: string;
  display_name: string;
}

interface SwapRow {
  id: string;
  requester_id: string;
  provider_id: string;
  duration_minutes: number;
  requester: ProfileRow;
  provider: ProfileRow;
  skill_taught: SkillRow;
  skill_offered: SkillRow;
}

const RESEND_SANDBOX_FROM = "Swap <onboarding@resend.dev>";

function emailHtml(opts: {
  recipientName: string;
  partnerName: string;
  taughtSkill: string;
  learnedSkill: string;
  hours: string;
}): string {
  const { recipientName, partnerName, taughtSkill, learnedSkill, hours } = opts;
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #241F1B;">
      <h2 style="color: #EB7432;">Your swap with ${partnerName} is confirmed!</h2>
      <p>Hi ${recipientName},</p>
      <p>Your ${hours}-hour skill swap with <strong>${partnerName}</strong> has been marked complete and confirmed by both of you.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 10px; background: #F5F3F0; border-radius: 8px 0 0 8px;">You taught<br/><strong>${taughtSkill}</strong></td>
          <td style="padding: 10px; background: #F5F3F0; border-radius: 0 8px 8px 0;">You learned<br/><strong>${learnedSkill}</strong></td>
        </tr>
      </table>
      <p>Thanks for trading skills, not money. Consider leaving ${partnerName} a rating on their profile.</p>
      <p style="color: #7A7268; font-size: 12px; margin-top: 24px;">— The Swap team</p>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string, apiKey: string, from: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }

  return res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  const providedSecret = req.headers.get("x-webhook-secret");

  if (!webhookSecret || providedSecret !== webhookSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: NotifyPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!payload.swap_id) {
    return new Response(JSON.stringify({ error: "swap_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: swap, error: swapError } = await supabase
      .from("swaps")
      .select(`
        id, requester_id, provider_id, duration_minutes,
        requester:profiles!swaps_requester_id_profiles_fkey(id, display_name),
        provider:profiles!swaps_provider_id_profiles_fkey(id, display_name),
        skill_taught:skills_catalog!swaps_skill_taught_id_fkey(name),
        skill_offered:skills_catalog!swaps_skill_offered_id_fkey(name)
      `)
      .eq("id", payload.swap_id)
      .single<SwapRow>();

    if (swapError || !swap) {
      throw new Error(`Swap not found: ${swapError?.message ?? payload.swap_id}`);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log(`notify-swap-confirmed: RESEND_API_KEY not set, skipping email for swap ${swap.id}`);
      return new Response(
        JSON.stringify({ sent: false, reason: "RESEND_API_KEY not configured" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") || RESEND_SANDBOX_FROM;

    const hours = (swap.duration_minutes / 60).toFixed(1);

    const [requesterAuth, providerAuth] = await Promise.all([
      supabase.auth.admin.getUserById(swap.requester_id),
      supabase.auth.admin.getUserById(swap.provider_id),
    ]);

    const requesterEmail = requesterAuth.data.user?.email;
    const providerEmail = providerAuth.data.user?.email;

    const results: Record<string, unknown> = {};

    if (requesterEmail) {
      try {
        results.requester = await sendEmail(
          requesterEmail,
          `Your swap with ${swap.provider.display_name} is confirmed`,
          emailHtml({
            recipientName: swap.requester.display_name,
            partnerName: swap.provider.display_name,
            taughtSkill: swap.skill_offered.name,
            learnedSkill: swap.skill_taught.name,
            hours,
          }),
          resendApiKey,
          fromAddress
        );
      } catch (err) {
        // One recipient failing (e.g. Resend's sandbox restriction on
        // unverified accounts) must never prevent the other recipient's
        // email from being attempted.
        console.error(`notify-swap-confirmed: failed to email requester (${requesterEmail}):`, err);
        results.requester = { error: String(err) };
      }
    }

    if (providerEmail) {
      try {
        results.provider = await sendEmail(
          providerEmail,
          `Your swap with ${swap.requester.display_name} is confirmed`,
          emailHtml({
            recipientName: swap.provider.display_name,
            partnerName: swap.requester.display_name,
            taughtSkill: swap.skill_taught.name,
            learnedSkill: swap.skill_offered.name,
            hours,
          }),
          resendApiKey,
          fromAddress
        );
      } catch (err) {
        console.error(`notify-swap-confirmed: failed to email provider (${providerEmail}):`, err);
        results.provider = { error: String(err) };
      }
    }

    return new Response(JSON.stringify({ sent: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-swap-confirmed error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
