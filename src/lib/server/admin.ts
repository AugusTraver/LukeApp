// Solo servidor: cliente con permisos totales (service role). Nunca importar desde el navegador.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FamilyData } from "../domain/types";
import { absenceFromRow, confFromRow, famFromRow, memberFromRow, overrideFromRow, swapFromRow } from "../store/supabase";

let admin: SupabaseClient | null = null;

export function adminClient() {
  if (typeof window !== "undefined") throw new Error("adminClient solo en el servidor");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY");
  admin ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

export async function loadFamilyServer(familyId: string): Promise<FamilyData> {
  const sb = adminClient();
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
  const [f, m, o, s, c, a] = await Promise.all([
    sb.from("families").select("*").eq("id", familyId).single(),
    sb.from("members").select("*").eq("family_id", familyId).order("created_at"),
    sb.from("overrides").select("*").eq("family_id", familyId).gte("date", since),
    sb.from("swaps").select("*").eq("family_id", familyId).gte("back_date", since),
    sb.from("confirmations").select("*").eq("family_id", familyId).gte("date", since),
    sb.from("absences").select("*").eq("family_id", familyId).gte("to_date", since),
  ]);
  for (const r of [f, m, o, s, c, a]) if (r.error) throw new Error(r.error.message);
  return {
    family: famFromRow(f.data),
    members: m.data!.map(memberFromRow),
    overrides: o.data!.map(overrideFromRow),
    swaps: s.data!.map(swapFromRow),
    confirmations: c.data!.map(confFromRow),
    absences: a.data!.map(absenceFromRow),
  };
}

/** Miembro vinculado al usuario del token (para /api/notify). */
export async function memberFromToken(token: string | null) {
  if (!token || token === "undefined") {
    console.error("[auth] pedido sin sesión");
    return null;
  }
  const sb = adminClient();
  const { data, error } = await sb.auth.getUser(token);
  if (!data.user) {
    // Si dice "Invalid API key", la SUPABASE_SECRET_KEY de Vercel está mal copiada.
    console.error("[auth] no se pudo validar la sesión:", error?.status, error?.message);
    return null;
  }
  const { data: row, error: e2 } = await sb.from("member_devices").select("member_id, family_id").eq("user_id", data.user.id).maybeSingle();
  if (!row) console.error("[auth] el usuario no está vinculado a una familia", e2?.message ?? "");
  return row ? { memberId: row.member_id as string, familyId: row.family_id as string } : null;
}
