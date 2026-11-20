import { tickAll } from "@/lib/server/tick";

// Lo llama Supabase (pg_cron + pg_net) cada 5 minutos.
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await tickAll();
  return Response.json({ ok: true, results });
}

export const GET = handle;
export const POST = handle;
