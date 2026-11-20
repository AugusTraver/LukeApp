// Modo Supabase: datos compartidos entre todos los celulares de la familia.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { storedFamily } from "../domain/calendars";
import type { Absence, Confirmation, Family, FamilyData, Member, Override, Swap } from "../domain/types";
import { StoreError, type FamilyPreview, type NewFamilyInput, type Session, type Store } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any -- filas de la API de datos */

export const famFromRow = (r: any): Family => ({
  id: r.id,
  name: r.name,
  dogName: r.dog_name,
  dogCoat: r.dog_coat,
  timeZone: r.time_zone,
  walkTimes: r.walk_times,
  fixedDays: r.fixed_days,
  rotation: r.rotation,
  rotationAnchor: r.rotation_anchor,
  startDate: r.start_date,
  settings: { penalty: r.penalty, insistent: r.insistent },
  joinCode: r.join_code,
  dogs: Array.isArray(r.dogs) && r.dogs.length ? r.dogs : undefined,
  calendars: Array.isArray(r.calendars) ? r.calendars : [],
});
export const absenceFromRow = (r: any): Absence => ({ id: r.id, memberId: r.member_id, from: r.from_date, to: r.to_date, reason: r.reason ?? undefined, createdAt: r.created_at });
export const memberFromRow = (r: any): Member => ({ id: r.id, name: r.name, avatar: r.avatar, color: r.color, role: r.role, walks: r.walks });
export const overrideFromRow = (r: any): Override => ({
  id: r.id,
  date: r.date,
  slot: r.slot,
  memberId: r.member_id,
  kind: r.kind,
  fromMemberId: r.from_member_id,
  reason: r.reason ?? undefined,
  createdAt: r.created_at,
  missedDate: r.missed_date ?? undefined,
  missedSlot: r.missed_slot ?? undefined,
  swapId: r.swap_id ?? undefined,
  calendarId: r.calendar_id ?? "main",
});
export const swapFromRow = (r: any): Swap => ({
  id: r.id,
  proposerId: r.proposer_id,
  partnerId: r.partner_id,
  date: r.date,
  slot: r.slot,
  backDate: r.back_date,
  backSlot: r.back_slot,
  reason: r.reason,
  status: r.status,
  createdAt: r.created_at,
  calendarId: r.calendar_id ?? "main",
});
export const confFromRow = (r: any): Confirmation => ({ id: r.id, date: r.date, slot: r.slot, walkedBy: r.walked_by, at: r.at, mood: r.mood ?? undefined, calendarId: r.calendar_id ?? "main" });

function fail(error: { message: string } | null, friendly?: string): void {
  if (!error) return;
  throw new StoreError(friendly ?? error.message);
}

let client: SupabaseClient | null = null;
export function supabase() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "lukeapp.auth" },
    });
  }
  return client;
}

export class SupabaseStore implements Store {
  readonly mode = "supabase" as const;
  private sb = supabase();
  private memberCache = new Map<string, string>();

  private async ensureUser() {
    const { data } = await this.sb.auth.getSession();
    if (data.session) return data.session.user;
    const { data: anon, error } = await this.sb.auth.signInAnonymously();
    fail(error, "No pudimos conectarnos. Revisá internet.");
    return anon.user!;
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.sb.auth.getSession();
    if (!data.session) return null;
    const { data: row } = await this.sb.from("member_devices").select("family_id, member_id").maybeSingle();
    return row ? { familyId: row.family_id, memberId: row.member_id } : null;
  }

  async signOut() {
    await this.sb.auth.signOut();
  }

  async createFamily(input: NewFamilyInput): Promise<Session> {
    if (!input.account) throw new StoreError("Falta el email del admin.");
    const { data: existing } = await this.sb.auth.getSession();
    if (existing.session?.user.is_anonymous) await this.sb.auth.signOut();
    const { data, error } = await this.sb.auth.signUp({ email: input.account.email, password: input.account.password });
    if (error) {
      // Si ya tiene cuenta, probamos entrar.
      const r = await this.sb.auth.signInWithPassword({ email: input.account.email, password: input.account.password });
      fail(r.error, error.message.includes("already") ? "Ese email ya tiene cuenta y la contraseña no coincide." : error.message);
    } else if (!data.session) {
      // Sin confirmación por email: si no vino sesión (cuenta ya existente), entramos directo.
      const r = await this.sb.auth.signInWithPassword({ email: input.account.email, password: input.account.password });
      fail(r.error, "Ese email ya tiene cuenta y la contraseña no coincide.");
    }
    const { data: res, error: e2 } = await this.sb.rpc("create_family", { payload: { family: input.family, members: input.members }, admin_pin: input.adminPin });
    fail(e2);
    return { familyId: res.familyId, memberId: res.memberId };
  }

  async signInAdmin(email: string, password: string): Promise<Session> {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    fail(error, "Email o contraseña incorrectos.");
    const s = await this.getSession();
    if (!s) throw new StoreError("Esta cuenta no tiene una familia.");
    return s;
  }

  async requestPasswordReset(email: string) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/?recuperar=1` });
    fail(error, error?.status === 429 ? "Ya te mandamos un email hace poco. Esperá unos minutos." : "No pudimos mandar el email. Revisá la dirección.");
  }

  async updatePassword(password: string): Promise<Session> {
    const { error } = await this.sb.auth.updateUser({ password });
    fail(error, error?.message.includes("different") ? "Elegí una contraseña distinta a la anterior." : "No se pudo cambiar la contraseña. Pedí otro email.");
    const s = await this.getSession();
    if (!s) throw new StoreError("Esta cuenta no tiene una familia.");
    return s;
  }

  onPasswordRecovery(cb: () => void) {
    const { data } = this.sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") cb();
    });
    return () => data.subscription.unsubscribe();
  }

  async previewFamily(joinCode: string): Promise<FamilyPreview | null> {
    await this.ensureUser();
    const { data, error } = await this.sb.rpc("preview_family", { code: joinCode });
    fail(error);
    return (data as FamilyPreview) ?? null;
  }

  async joinFamily(joinCode: string, memberId: string, pin: string): Promise<Session> {
    await this.ensureUser();
    const { data, error } = await this.sb.rpc("join_family", { code: joinCode, member: memberId, pin });
    fail(error);
    if (data?.error) throw new StoreError(data.error);
    return { familyId: data.familyId, memberId: data.memberId };
  }

  async load(familyId: string): Promise<FamilyData> {
    const since = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10);
    const [f, m, o, s, c, a] = await Promise.all([
      this.sb.from("families").select("*").eq("id", familyId).maybeSingle(),
      this.sb.from("members").select("*").eq("family_id", familyId).order("created_at"),
      this.sb.from("overrides").select("*").eq("family_id", familyId).gte("date", since),
      this.sb.from("swaps").select("*").eq("family_id", familyId).gte("back_date", since),
      this.sb.from("confirmations").select("*").eq("family_id", familyId).gte("date", since),
      this.sb.from("absences").select("*").eq("family_id", familyId).gte("to_date", since),
    ]);
    for (const r of [f, m, o, s, c, a]) fail(r.error, "No pudimos cargar los datos.");
    if (!f.data) throw new StoreError("Esta familia ya no existe.");
    return {
      family: famFromRow(f.data),
      members: m.data!.map(memberFromRow),
      overrides: o.data!.map(overrideFromRow),
      swaps: s.data!.map(swapFromRow),
      confirmations: c.data!.map(confFromRow),
      absences: a.data!.map(absenceFromRow),
    };
  }

  subscribe(familyId: string, onChange: () => void) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(onChange, 250);
    };
    const filter = `family_id=eq.${familyId}`;
    const ch = this.sb
      .channel(`family-${familyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "overrides", filter }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "swaps", filter }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "confirmations", filter }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "absences", filter }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "families", filter: `id=eq.${familyId}` }, debounced)
      .subscribe();
    return () => {
      clearTimeout(timer);
      void this.sb.removeChannel(ch);
    };
  }

  private async myMemberId(familyId: string) {
    if (!this.memberCache.has(familyId)) {
      const s = await this.getSession();
      if (s) this.memberCache.set(s.familyId, s.memberId);
    }
    return this.memberCache.get(familyId)!;
  }

  async addConfirmation(familyId: string, c: Confirmation) {
    const { error } = await this.sb.from("confirmations").insert({ id: c.id, family_id: familyId, calendar_id: c.calendarId ?? "main", date: c.date, slot: c.slot, walked_by: c.walkedBy, mood: c.mood ?? null });
    fail(error, error?.code === "23505" ? "Alguien ya lo confirmó." : "No se pudo confirmar.");
  }

  async addOverrides(familyId: string, os: Override[]) {
    const me = await this.myMemberId(familyId);
    const rows = os.map((o) => ({
      id: o.id,
      family_id: familyId,
      date: o.date,
      slot: o.slot,
      member_id: o.memberId,
      kind: o.kind,
      from_member_id: o.fromMemberId ?? null,
      reason: o.reason ?? null,
      missed_date: o.missedDate ?? null,
      missed_slot: o.missedSlot ?? null,
      swap_id: o.swapId ?? null,
      calendar_id: o.calendarId ?? "main",
      created_by: me,
    }));
    // Las deudas pueden llegar duplicadas desde varios celulares: se ignoran.
    const debts = rows.filter((r) => r.kind === "debt");
    const rest = rows.filter((r) => r.kind !== "debt");
    if (rest.length) fail((await this.sb.from("overrides").insert(rest)).error, "No se pudo guardar el cambio.");
    for (const d of debts) {
      const { error } = await this.sb.from("overrides").insert(d);
      if (error && error.code !== "23505") fail(error);
    }
    void this.notify(familyId, { type: "overrides", ids: rows.filter((r) => r.kind !== "debt").map((r) => r.id) });
  }

  async saveSwap(familyId: string, s: Swap) {
    const row = {
      id: s.id,
      family_id: familyId,
      proposer_id: s.proposerId,
      partner_id: s.partnerId,
      date: s.date,
      slot: s.slot,
      back_date: s.backDate,
      back_slot: s.backSlot,
      reason: s.reason,
      status: s.status,
      calendar_id: s.calendarId ?? "main",
    };
    const { error } = s.status === "pending" ? await this.sb.from("swaps").insert(row) : await this.sb.from("swaps").update({ status: s.status }).eq("id", s.id);
    fail(error, "No se pudo guardar el intercambio.");
    void this.notify(familyId, { type: "swap", id: s.id });
  }

  async updateFamily(family: Family) {
    const f = storedFamily(family);
    const { error } = await this.sb
      .from("families")
      .update({
        dogs: f.dogs ?? [],
        calendars: f.calendars ?? [],
        name: f.name,
        dog_name: f.dogName,
        dog_coat: f.dogCoat,
        walk_times: f.walkTimes,
        fixed_days: f.fixedDays,
        rotation: f.rotation,
        penalty: f.settings.penalty,
        insistent: f.settings.insistent,
      })
      .eq("id", f.id);
    fail(error, "No se pudo guardar.");
  }

  async saveMember(familyId: string, m: Member): Promise<Member> {
    const row = { family_id: familyId, name: m.name, avatar: m.avatar, color: m.color, role: m.role, walks: m.walks };
    const { data, error } = m.id
      ? await this.sb.from("members").update(row).eq("id", m.id).select().single()
      : await this.sb.from("members").insert(row).select().single();
    fail(error, "No se pudo guardar.");
    return memberFromRow(data);
  }

  async removeMember(_familyId: string, memberId: string) {
    const { error } = await this.sb.rpc("remove_member", { member: memberId });
    fail(error, "No se pudo sacar.");
  }

  async updateMyAvatar(familyId: string, _memberId: string, avatar: string, color: string) {
    const { error } = await this.sb.rpc("update_my_avatar", { fid: familyId, new_avatar: avatar, new_color: color });
    fail(error, "No se pudo guardar el avatar.");
  }

  async addAbsence(familyId: string, a: Absence) {
    const me = await this.myMemberId(familyId);
    const { error } = await this.sb.from("absences").insert({ id: a.id, family_id: familyId, member_id: a.memberId, from_date: a.from, to_date: a.to, reason: a.reason ?? null, created_by: me });
    fail(error, "No se pudo guardar.");
  }

  async removeAbsence(_familyId: string, id: string) {
    fail((await this.sb.from("absences").delete().eq("id", id)).error, "No se pudo borrar.");
  }

  async leaveFamily(familyId: string) {
    const { error } = await this.sb.rpc("leave_family", { fid: familyId });
    fail(error);
    this.memberCache.delete(familyId);
    await this.sb.auth.signOut();
  }

  async deleteFamily(familyId: string) {
    const { error } = await this.sb.rpc("delete_family", { fid: familyId });
    fail(error, "No se pudo borrar la familia.");
    this.memberCache.delete(familyId);
    await this.sb.auth.signOut();
  }

  async resetPin(_familyId: string, memberId: string) {
    fail((await this.sb.rpc("reset_pin", { member: memberId })).error);
  }

  async savePushSubscription(familyId: string, memberId: string, sub: PushSubscriptionJSON) {
    const { error } = await this.sb.from("push_subscriptions").upsert({
      endpoint: sub.endpoint,
      family_id: familyId,
      member_id: memberId,
      p256dh: sub.keys?.p256dh,
      auth: sub.keys?.auth,
    });
    fail(error, "No se pudieron guardar los avisos.");
  }

  async sendTestPush(familyId: string) {
    await this.notify(familyId, { type: "test" });
  }

  /** Pide al servidor que avise a los involucrados (cambios, intercambios, pruebas). */
  private async notify(familyId: string, event: Record<string, unknown>) {
    try {
      const { data } = await this.sb.auth.getSession();
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ familyId, ...event }),
      });
    } catch {
      /* el aviso es secundario */
    }
  }
}
