import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const users = {
  "Misael Estrada": "ME4827",
  "Jhon Rojas": "JR7316",
  "Hugo Escobar": "HE9054",
  "Jesús Chávez": "JC2681",
  "Valeria Rodriguez": "VR6149",
} as const;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { name, code } = await request.json();
    const expectedCode = users[name as keyof typeof users];
    if (!expectedCode || code?.trim().toUpperCase() !== expectedCode) {
      return new Response(JSON.stringify({ error: "Nombre o código incorrecto." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@internal.friopacking.local`;

    const accounts = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (accounts.error) throw accounts.error;
    const account = accounts.data.users.find((user) => user.email === email);
    if (!account) {
      const created = await admin.auth.admin.createUser({
        email,
        password: expectedCode,
        email_confirm: true,
        user_metadata: { full_name: name },
      });
      if (created.error || !created.data.user) throw created.error || new Error("No se pudo crear el usuario interno.");
    }

    const publicClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const signedIn = await publicClient.auth.signInWithPassword({ email, password: expectedCode });
    if (signedIn.error || !signedIn.data.session) throw signedIn.error || new Error("No se pudo iniciar sesión.");

    return new Response(JSON.stringify({
      access_token: signedIn.data.session.access_token,
      refresh_token: signedIn.data.session.refresh_token,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error de autenticación." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
