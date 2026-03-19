import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:8080";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAFF_ROLES = new Set(["analyst", "specialist", "authority", "admin", "reader"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authorization = request.headers.get("Authorization");
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return json({ success: false, error: "Missing access token" }, 401);
    }

    const { data: authUser, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser.user) {
      return json({ success: false, error: authError?.message ?? "Unauthorized" }, 401);
    }

    const { data: callerRoles, error: callerRolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.user.id);

    if (callerRolesError) {
      return json({ success: false, error: callerRolesError.message }, 500);
    }

    const isAdmin = (callerRoles ?? []).some((entry) => entry.role === "admin");
    if (!isAdmin) {
      return json({ success: false, error: "Only administrators can invite reserved accounts" }, 403);
    }

    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "").trim();

    if (!email || !role) {
      return json({ success: false, error: "Email and role are required" }, 400);
    }

    if (!STAFF_ROLES.has(role)) {
      return json({ success: false, error: "Unsupported role" }, 400);
    }

    const temporaryPassword = generateTemporaryPassword();

    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      return json({ success: false, error: listError.message }, 500);
    }

    const existingUser = existingUsers.users.find((user) => user.email?.toLowerCase() === email);
    let invitedUserId = existingUser?.id ?? null;
    let mailSent = false;

    if (!existingUser) {
      const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
          invited_role: role,
          temp_password: temporaryPassword,
          force_password_change: true,
        },
        redirectTo: `${APP_URL}/login/staff`,
      });

      if (inviteError) {
        return json({ success: false, error: inviteError.message }, 400);
      }

      invitedUserId = invited.user?.id ?? null;
      mailSent = true;
    }

    if (!invitedUserId) {
      return json({ success: false, error: "Unable to resolve invited user id" }, 500);
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(invitedUserId, {
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        ...(existingUser?.user_metadata ?? {}),
        full_name: fullName || existingUser?.user_metadata?.full_name || "",
        invited_role: role,
        temp_password: temporaryPassword,
        force_password_change: true,
      },
    });

    if (updateError) {
      return json({ success: false, error: updateError.message }, 500);
    }

    const { error: roleError } = await supabase.from("user_roles").upsert({
      user_id: invitedUserId,
      role,
    }, {
      onConflict: "user_id,role",
      ignoreDuplicates: true,
    });

    if (roleError) {
      return json({ success: false, error: roleError.message }, 500);
    }

    return json({
      success: true,
      invited: !existingUser,
      email,
      role,
      user_id: invitedUserId,
      temporary_password: temporaryPassword,
      mail_sent: mailSent,
      force_password_change: true,
      message: existingUser
        ? "Le role a ete attribue au compte existant. Le mot de passe temporaire a ete regenere."
        : "Invitation envoyee avec succes avec mot de passe temporaire.",
    });
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  let password = "";
  for (let index = 0; index < 14; index += 1) {
    password += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  if (!/[A-Z]/.test(password)) password += "A";
  if (!/[a-z]/.test(password)) password += "a";
  if (!/[0-9]/.test(password)) password += "9";
  if (!/[!@#$%&*]/.test(password)) password += "!";
  return password;
}

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
