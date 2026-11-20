import { adminClient } from "@/lib/server/admin";
import { tickAll } from "@/lib/server/tick";

// Lo llama Supabase (pg_cron + pg_net) cada 5 minutos.
// Se acepta la clave CRON_SECRET (si está configurada) o la clave que generó la propia base
// de datos en public.app_secrets (así nadie tiene que copiar secretos a mano).
let dbToken: string | null = null;
async function cronToken() {
  if (dbToken) return dbToken;
  const { data } = await adminClient().from("app_secrets").select("value").eq("name", "cron").maybeSingle();
  dbToken = (data?.value as string | undefined) ?? null;
  return dbToken;
}

async function handle(request: Request) {
  const auth = request.headers.get("authorization");
  const env = process.env.CRON_SECRET;
  const ok = !!auth && ((!!env && auth === `Bearer ${env}`) || auth === `Bearer ${await cronToken()}`);
  if (!ok || auth === "Bearer null") {
    console.error("[cron] pedido sin la clave correcta");
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await tickAll();
  return Response.json({ ok: true, results });
}

export const GET = handle;
export const POST = handle;
