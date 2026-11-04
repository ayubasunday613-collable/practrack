import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

function respond(status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

async function hashCode(code: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond(405, { error: "Method not allowed" });

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return respond(500, { error: "Supabase function secrets are incomplete" });
  }
  if (!resendApiKey || !fromEmail) {
    return respond(503, { error: "Assignment email is not configured" });
  }
  if (!authorization) return respond(401, { error: "Sign in before sending an assignment email" });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user)
      return respond(401, { error: "Authentication could not be verified" });

    const body: unknown = await request.json();
    if (
      !isRecord(body) ||
      typeof body.assignmentId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.assignmentId) ||
      typeof body.code !== "string" ||
      !/^[0-9A-F]{32}$/.test(body.code)
    ) {
      return respond(400, { error: "A valid assignment and report code are required" });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role,status")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.role !== "technologist" || profile.status !== "approved") {
      return respond(403, { error: "An approved Technologist account is required" });
    }

    const { data: assignment, error: assignmentError } = await adminClient
      .from("assignments")
      .select("id,practical_id,student_id,assigned_by")
      .eq("id", body.assignmentId)
      .maybeSingle();
    if (assignmentError) throw assignmentError;
    if (!assignment || assignment.assigned_by !== userData.user.id) {
      return respond(404, { error: "Assignment not found" });
    }

    const [{ data: practical, error: practicalError }, { data: student, error: studentError }] =
      await Promise.all([
        adminClient
          .from("practicals")
          .select("title,created_by")
          .eq("id", assignment.practical_id)
          .maybeSingle(),
        adminClient
          .from("profiles")
          .select("full_name,role,status")
          .eq("user_id", assignment.student_id)
          .maybeSingle(),
      ]);
    if (practicalError) throw practicalError;
    if (studentError) throw studentError;
    if (!practical || practical.created_by !== userData.user.id) {
      return respond(403, { error: "You cannot email a code for this practical" });
    }
    if (!student || student.role !== "student" || student.status !== "approved") {
      return respond(409, { error: "The assigned student account is not approved" });
    }

    const { data: codeRow, error: codeError } = await adminClient
      .from("report_codes")
      .select("id")
      .eq("assignment_id", assignment.id)
      .eq("created_by", userData.user.id)
      .eq("code_hash", await hashCode(body.code))
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (codeError) throw codeError;
    if (!codeRow)
      return respond(409, {
        error: "The report code is no longer active. Reassign to issue a fresh code.",
      });

    const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(
      assignment.student_id,
    );
    if (authError) throw authError;
    const email = authData.user?.email;
    if (!email) return respond(409, { error: "The student account has no email address" });

    const appUrl =
      Deno.env.get("APP_BASE_URL") ?? "https://ayubasunday613-collable.github.io/practrack/";
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `Practical assigned: ${practical.title}`,
        text: [
          `Hello ${student.full_name},`,
          "",
          `The practical "${practical.title}" has been assigned to your PracTrack account.`,
          `Your one-time report code is: ${body.code}`,
          "Sign in to PracTrack to open the assigned practical. The code expires in seven days and can only be used once.",
          "",
          appUrl,
        ].join("\n"),
        html: `<p>Hello ${escapeHtml(student.full_name)},</p><p>The practical <strong>${escapeHtml(practical.title)}</strong> has been assigned to your PracTrack account.</p><p>Your one-time report code is: <strong>${body.code}</strong></p><p>Sign in to <a href="${escapeHtml(appUrl)}">PracTrack</a> to open the assigned practical. The code expires in seven days and can only be used once.</p>`,
      }),
    });
    if (!emailResponse.ok) {
      console.error("Resend rejected an assignment notification.", emailResponse.status);
      return respond(502, {
        error: "The student email could not be sent. Check the Resend configuration.",
      });
    }

    return respond(200, { sent: true });
  } catch (error) {
    console.error("Could not send the practical assignment notification.", error);
    return respond(500, { error: "The practical assignment email could not be sent" });
  }
});
