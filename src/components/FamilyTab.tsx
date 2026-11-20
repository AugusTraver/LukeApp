"use client";

import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Copy,
  DoorOpen,
  KeyRound,
  LogOut,
  Luggage,
  Plus,
  Route,
  Scale,
  Settings2,
  Share2,
  Smartphone,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { activeCalendars, allCalendars, allDogs, joinNames, newCalendarFrom, setWalksEverywhere, withCalendars } from "@/lib/domain/calendars";
import { addDays, dayName } from "@/lib/domain/dates";
import { MAIN, type Calendar, type Dog as DogT, type Family, type Member } from "@/lib/domain/types";
import { useFamily } from "@/lib/useFamily";
import { Avatar, AvatarPicker } from "./Avatar";
import { BallGame } from "./BallGame";
import { Dog, DogPack, type DogCoat } from "./Dog";
import { CoatPicker, Field, FixedDaysEditor, Segmented, TimesEditor } from "./form";
import { InstallSheet, NotificationsCard } from "./Notifications";
import { MemberEditor, newDraft } from "./Onboarding";
import { IconBadge, Sheet } from "./ui";

type SheetId = null | "how" | "game" | "settings" | "away" | "install" | "leave" | "myAvatar" | { member: Member | null };

const ddmm = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;

export function FamilyTab({ toast }: { toast: (m: string) => void }) {
  const f = useFamily();
  const { data, full, me, isAdmin } = f;
  const [sheet, setSheet] = useState<SheetId>(null);
  const cals = activeCalendars(full.family);
  const dogs = allDogs(full.family);
  const allNames = joinNames(dogs.map((d) => d.name));
  const awayNow = (full.absences ?? []).filter((a) => a.to >= f.now.date);

  const roleText = (m: Member) => {
    const fixed = data.family.fixedDays.map((x, i) => (x === m.id ? dayName(i) : null)).filter(Boolean);
    const base = m.role === "admin" ? (m.walks ? "Admin, pasea" : "Admin") : m.walks ? "Pasea" : "Solo mira";
    const away = awayNow.find((a) => a.memberId === m.id);
    const extra = away ? `. De viaje ${away.from <= f.now.date ? "hasta el" : `del ${ddmm(away.from)} al`} ${ddmm(away.to)}` : fixed.length ? `. Fijo los ${fixed.join(" y ")}` : "";
    return base + extra;
  };

  async function share() {
    const text = `Sumate a ${data.family.name} en LukeApp para organizar los paseos de ${allNames}.\nCódigo: ${data.family.joinCode}\n${location.origin}`;
    try {
      if (navigator.share) await navigator.share({ title: "LukeApp", text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Copiado. Pegalo en WhatsApp.");
      }
    } catch {
      /* compartir cancelado */
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-3 flex items-center gap-4">
        <span className="h-20 min-w-20 px-1 rounded-full bg-pine flex items-end justify-center overflow-hidden shrink-0">
          <DogPack coats={dogs.map((d) => d.coat)} size={dogs.length > 1 ? 80 : 92} sun={false} className="translate-y-2" />
        </span>
        <div className="min-w-0">
          <h1 className="display text-[1.85rem] leading-tight">{data.family.name}</h1>
          {cals.map((c) => (
            <p key={c.calendar.id} className="text-ink-2">
              {c.name} {c.dogs.length > 1 ? "salen" : "sale"} a las {c.calendar.walkTimes.join(" y a las ")}
            </p>
          ))}
        </div>
      </header>

      <NotificationsCard toast={toast} />

      <section className="card p-5">
        <h2 className="font-semibold text-lg">Invitar a la familia</h2>
        <p className="text-ink-2 mt-1">Compartí este código. Se ingresa en “Entrar a mi familia”.</p>
        <div className="mt-4 flex flex-col gap-2.5">
          <button
            className="tap w-full rounded-2xl bg-sunken py-4 flex items-center justify-center gap-3"
            onClick={() => void navigator.clipboard?.writeText(data.family.joinCode).then(() => toast("Código copiado."))}
            aria-label="Copiar código"
          >
            <span className="display text-[2rem] tracking-[0.1em] whitespace-nowrap">{data.family.joinCode}</span>
            <Copy size={17} className="text-ink-3" />
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => void share()}>
            <Share2 size={19} /> Compartir código
          </button>
        </div>
      </section>

      <section className="card overflow-hidden">
        <h2 className="font-semibold text-lg px-5 pt-5 pb-2">Integrantes</h2>
        <ul className="divide-y divide-line">
          {data.members.map((m) => (
            <li key={m.id}>
              <button
                className="tap w-full flex items-center gap-3.5 px-5 py-3 text-left disabled:cursor-default active:bg-sunken"
                disabled={!isAdmin && m.id !== me.id}
                onClick={() => setSheet(isAdmin ? { member: m } : "myAvatar")}
              >
                <Avatar member={m} size={46} />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">
                    {m.name}
                    {m.id === me.id && <span className="font-normal text-ink-3"> (vos)</span>}
                  </span>
                  <span className="block text-[0.9375rem] text-ink-3">{!isAdmin && m.id === me.id ? "Tocá para cambiar tu avatar" : roleText(m)}</span>
                </span>
                {(isAdmin || m.id === me.id) && <ChevronRight size={20} className="text-ink-3" />}
              </button>
            </li>
          ))}
        </ul>
        {isAdmin && (
          <div className="p-4 pt-2">
            <button className="btn btn-dashed w-full" onClick={() => setSheet({ member: null })}>
              <Plus size={18} /> Sumar a alguien
            </button>
          </div>
        )}
      </section>

      <section className="card overflow-hidden divide-y divide-line">
        {(me.walks || isAdmin) && <Row icon={<Luggage size={20} />} label="Vacaciones o días que no estoy" onClick={() => setSheet("away")} />}
        {isAdmin && <Row icon={<Settings2 size={20} />} label="Perros, horarios y reglas" onClick={() => setSheet("settings")} />}
        <Row icon={<Smartphone size={20} />} label="Instalar la app en el celular" onClick={() => setSheet("install")} />
        <Row icon={<Dog mood="happy" coat={data.family.dogCoat as DogCoat} size={30} sun={false} />} label={`Jugar con ${data.family.dogName}`} onClick={() => setSheet("game")} />
        <Row icon={<CircleHelp size={20} />} label="¿Cómo funciona?" onClick={() => setSheet("how")} />
      </section>

      <section className="card overflow-hidden divide-y divide-line">
        <Row icon={<LogOut size={20} />} label="Cerrar sesión en este celular" onClick={() => void f.signOut()} />
        <Row icon={<DoorOpen size={20} />} label="Salir de la familia" onClick={() => setSheet("leave")} danger />
      </section>

      <Sheet open={sheet === "how"} onClose={() => setSheet(null)} title="¿Cómo funciona?">
        <HowItWorks family={data.family} />
        <p className="text-[0.8125rem] text-ink-3 mt-8">
          Avatares:{" "}
          <a className="underline" href="https://personas.draftbit.com/" target="_blank" rel="noreferrer">
            Personas de Draftbit
          </a>
          , licencia CC BY 4.0.
        </p>
      </Sheet>
      <Sheet open={sheet === "game"} onClose={() => setSheet(null)} title={`Jugá con ${data.family.dogName}`}>
        <BallGame />
      </Sheet>
      <InstallSheet open={sheet === "install"} onClose={() => setSheet(null)} />
      {sheet === "settings" && <SettingsSheet onClose={() => setSheet(null)} toast={toast} />}
      {sheet === "away" && <AwaySheet onClose={() => setSheet(null)} toast={toast} />}
      {sheet === "leave" && <LeaveSheet onClose={() => setSheet(null)} />}
      {sheet === "myAvatar" && <MyAvatarSheet onClose={() => setSheet(null)} toast={toast} />}
      {typeof sheet === "object" && sheet !== null && <MemberSheet member={sheet.member} onClose={() => setSheet(null)} toast={toast} />}
    </div>
  );
}

function Row({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button className="tap w-full flex items-center gap-3.5 px-5 py-4 text-left active:bg-sunken" onClick={onClick}>
      <span className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${danger ? "bg-clay-soft text-clay" : "bg-pine-soft text-pine"}`}>{icon}</span>
      <span className={`flex-1 font-medium ${danger ? "text-clay" : ""}`}>{label}</span>
      <ChevronRight size={20} className="text-ink-3" />
    </button>
  );
}

function HowItWorks({ family }: { family: Family }) {
  const steps: [React.ReactNode, string, string][] = [
    [<CalendarDays key="c" size={20} />, "Cada día tiene a alguien", "La app reparte los paseos. Algunos días son fijos y el resto se turnan en orden."],
    [<Bell key="b" size={20} />, "Te avisamos", "10 minutos antes y a la hora. Si no confirmás, insistimos hasta que lo hagas."],
    [<Dog key="d" mood="happy" coat={family.dogCoat as DogCoat} size={30} sun={false} />, "Lo sacás y lo confirmás", "Tocás “Ya lo saqué” y toda la familia lo ve."],
    [<X key="x" size={20} />, "¿No podés? Avisá antes", "El paseo pasa en el momento a otra persona. También podés pedir cambiar el día."],
    [<Luggage key="l" size={20} />, "¿Te vas de viaje?", "Cargá los días que no estás. Tus turnos se reparten entre los demás y no cuentan como falta."],
    ...(family.settings.penalty
      ? ([[<Scale key="s" size={20} />, "Si nadie lo confirma", `Quien faltó saca a ${family.dogName} en el próximo turno de otra persona: es el paseo de deuda.`]] as [React.ReactNode, string, string][])
      : []),
  ];
  return (
    <ol className="flex flex-col gap-5">
      {steps.map(([icon, title, text]) => (
        <li key={title} className="flex gap-4">
          <span className="h-11 w-11 rounded-full bg-pine-soft text-pine flex items-center justify-center shrink-0 overflow-hidden">{icon}</span>
          <div>
            <p className="font-semibold text-lg">{title}</p>
            <p className="text-ink-2 mt-0.5">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ================= Integrante ================= */

function MemberSheet({ member, onClose, toast }: { member: Member | null; onClose: () => void; toast: (m: string) => void }) {
  const f = useFamily();
  const isNew = !member;
  const [draft, setDraft] = useState<Omit<Member, "id">>(member ?? newDraft(f.full.members.length));
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const isMe = member?.id === f.me.id;

  async function save() {
    setBusy(true);
    try {
      const saved = await f.store.saveMember(f.full.family.id, { ...draft, id: member?.id ?? "", name: draft.name.trim() });
      await f.store.updateFamily(setWalksEverywhere(f.full.family, saved.id, saved.walks));
      await f.reload();
      toast(isNew ? `Listo. Pasale el código a ${saved.name}.` : "Cambios guardados.");
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={isNew ? "Sumar a alguien" : draft.name}>
      <MemberEditor draft={draft} isFirst={isMe} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} />
      <button className="btn btn-primary btn-lg mt-5" disabled={!draft.name.trim() || busy} onClick={() => void save()}>
        Guardar
      </button>
      {!isNew && !isMe && !removing && (
        <div className="flex flex-col gap-1 mt-4">
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await f.store.resetPin(f.full.family.id, member.id);
              toast(`${member.name} va a poder crear un PIN nuevo.`);
            }}
          >
            <KeyRound size={18} /> Se olvidó el PIN
          </button>
          <button className="btn btn-danger" onClick={() => setRemoving(true)}>
            <Trash2 size={18} /> Sacar de la familia
          </button>
        </div>
      )}
      {removing && member && (
        <div className="mt-5 rounded-2xl bg-clay-soft p-4">
          <p className="font-semibold">¿Sacar a {member.name}?</p>
          <p className="text-ink-2 mt-1">Deja de ver la familia y sus turnos se reparten entre los demás. Su historial de paseos se mantiene.</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button className="btn btn-outline" onClick={() => setRemoving(false)}>
              Cancelar
            </button>
            <button
              className="btn !bg-clay !text-white"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await f.store.removeMember(f.full.family.id, member.id);
                  await f.reload();
                  toast(`${member.name} ya no está en la familia.`);
                  onClose();
                } catch (e) {
                  toast(e instanceof Error ? e.message : "No se pudo sacar.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Sacar
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/** Para quien no es admin: cambiar solo su propio avatar. */
function MyAvatarSheet({ onClose, toast }: { onClose: () => void; toast: (m: string) => void }) {
  const f = useFamily();
  const [avatar, setAvatar] = useState(f.me.avatar);
  const [color, setColor] = useState(f.me.color);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open onClose={onClose} title="Tu avatar">
      <AvatarPicker
        value={avatar}
        color={color}
        name={f.me.name}
        onChange={(p) => {
          if (p.avatar) setAvatar(p.avatar);
          if (p.color) setColor(p.color);
        }}
      />
      <button
        className="btn btn-primary btn-lg mt-4"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await f.store.updateMyAvatar(f.full.family.id, f.me.id, avatar, color);
            await f.reload();
            toast("Avatar guardado.");
            onClose();
          } catch (e) {
            toast(e instanceof Error ? e.message : "No se pudo guardar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Guardar
      </button>
    </Sheet>
  );
}

/* ================= Vacaciones / no estoy ================= */

const REASONS = ["Vacaciones", "Viaje", "Trabajo", "Enfermedad"];

function AwaySheet({ onClose, toast }: { onClose: () => void; toast: (m: string) => void }) {
  const f = useFamily();
  const { full, me, isAdmin, now } = f;
  const walkers = full.members.filter((m) => m.walks);
  const [who, setWho] = useState(me.walks ? me.id : (walkers[0]?.id ?? me.id));
  const [from, setFrom] = useState(addDays(now.date, 1));
  const [to, setTo] = useState(addDays(now.date, 7));
  const [reason, setReason] = useState("Vacaciones");
  const [busy, setBusy] = useState(false);
  const list = (full.absences ?? []).filter((a) => a.to >= now.date).sort((a, b) => a.from.localeCompare(b.from));
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  const valid = from && to && to >= from && to >= now.date && days <= 121;

  return (
    <Sheet open onClose={onClose} title="Días que no estoy">
      <p className="text-ink-2">Esos días los turnos se reparten entre los demás y no cuentan como falta. Nadie tiene que hacer cambios a mano.</p>

      {list.length > 0 && (
        <ul className="card divide-y divide-line mt-5">
          {list.map((a) => {
            const m = f.member(a.memberId);
            const canDelete = a.memberId === me.id || isAdmin;
            return (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar member={m} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{m?.id === me.id ? "Vos" : (m?.name ?? "Alguien")}</p>
                  <p className="text-[0.9375rem] text-ink-3">
                    {a.from === a.to ? `El ${ddmm(a.from)}` : `Del ${ddmm(a.from)} al ${ddmm(a.to)}`}
                    {a.reason ? `. ${a.reason}` : ""}
                  </p>
                </div>
                {canDelete && (
                  <button
                    className="tap h-10 w-10 rounded-full text-ink-3 flex items-center justify-center"
                    aria-label="Borrar"
                    onClick={() => void f.removeAbsence(a.id).then(() => toast("Listo, se borró."), (e) => toast(e instanceof Error ? e.message : "No se pudo borrar."))}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="display text-[1.5rem] mt-7">Avisar que no estoy</h3>
      <div className="flex flex-col gap-5 mt-4">
        {isAdmin && walkers.length > 1 && (
          <div>
            <p className="label">¿Quién?</p>
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
              {walkers.map((m) => (
                <button key={m.id} type="button" className="option shrink-0 !pl-1.5" aria-pressed={who === m.id} onClick={() => setWho(m.id)}>
                  <Avatar member={m} size={30} /> {m.id === me.id ? "Yo" : m.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde">
            <input
              type="date"
              className="field tabular-nums"
              value={from}
              min={now.date}
              onChange={(e) => {
                setFrom(e.target.value);
                if (to < e.target.value) setTo(e.target.value);
              }}
            />
          </Field>
          <Field label="Hasta">
            <input type="date" className="field tabular-nums" value={to} min={from || now.date} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <div>
          <p className="label">Motivo (opcional)</p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button key={r} type="button" className="option" aria-pressed={reason === r} onClick={() => setReason(reason === r ? "" : r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <button
          className="btn btn-primary btn-lg"
          disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await f.addAbsence(who, from, to, reason);
              toast(who === me.id ? "Listo. Tus turnos de esos días ya se repartieron." : `Listo. Los turnos de ${f.member(who)?.name} de esos días ya se repartieron.`);
              onClose();
            } catch (e) {
              toast(e instanceof Error ? e.message : "No se pudo guardar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Guardar {valid ? `(${days} ${days === 1 ? "día" : "días"})` : ""}
        </button>
      </div>
    </Sheet>
  );
}

/* ================= Salir / borrar ================= */

function LeaveSheet({ onClose }: { onClose: () => void }) {
  const f = useFamily();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const soleAdmin = f.isAdmin && !f.full.members.some((m) => m.role === "admin" && m.id !== f.me.id);
  return (
    <Sheet open onClose={onClose} title="Salir de la familia">
      {soleAdmin ? (
        <>
          <p className="text-ink-2">Sos quien administra la familia. Si te vas, nadie podría cambiar las reglas.</p>
          <p className="text-ink-2 mt-3">
            Si ya no la van a usar, podés borrarla desde <span className="font-semibold text-ink">Perros, horarios y reglas</span>, al final.
          </p>
          <button className="btn btn-outline btn-lg mt-6" onClick={onClose}>
            Entendido
          </button>
        </>
      ) : (
        <>
          <p className="text-ink-2">Vas a dejar de ver los paseos de {joinNames(allDogs(f.full.family).map((d) => d.name))}. Tus turnos se reparten entre los demás y tu historial de paseos queda guardado.</p>
          <p className="text-ink-2 mt-3">Para volver, alguien te tiene que pasar el código otra vez.</p>
          {error && (
            <p className="mt-4 font-medium text-clay" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2 mt-6">
            <button
              className="btn btn-lg !bg-clay !text-white"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await f.leave();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "No se pudo salir.");
                  setBusy(false);
                }
              }}
            >
              <DoorOpen size={19} /> Salir de la familia
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              Me quedo
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function DeleteFamily() {
  const f = useFamily();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ok = text.trim().toUpperCase() === "BORRAR";
  return (
    <div className="rounded-2xl ring-1 ring-clay/25 p-4">
      <p className="font-semibold text-clay">Borrar la familia</p>
      <p className="text-ink-2 text-[0.9375rem] mt-1">Se borra todo para todos: integrantes, turnos, avisos e historial. No se puede deshacer.</p>
      {!open ? (
        <button className="btn btn-danger !px-0 mt-1" onClick={() => setOpen(true)}>
          <Trash2 size={18} /> Quiero borrarla
        </button>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <Field label="Escribí BORRAR para confirmar">
            <input className="field uppercase tracking-wider" value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="characters" autoComplete="off" />
          </Field>
          {error && (
            <p className="font-medium text-clay" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn btn-lg !bg-clay !text-white"
            disabled={!ok || busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await f.deleteFamily();
              } catch (e) {
                setError(e instanceof Error ? e.message : "No se pudo borrar.");
                setBusy(false);
              }
            }}
          >
            Borrar para siempre
          </button>
        </div>
      )}
    </div>
  );
}

/* ================= Perros, horarios y reglas ================= */

function SettingsSheet({ onClose, toast }: { onClose: () => void; toast: (m: string) => void }) {
  const f = useFamily();
  const [fam, setFam] = useState<Family>(() => structuredClone(f.full.family));
  const [cals, setCals] = useState<Calendar[]>(() => structuredClone(allCalendars(f.full.family)));
  const [dogs, setDogs] = useState<DogT[]>(() => structuredClone(allDogs(f.full.family)));
  const [editing, setEditing] = useState<string>(f.calendarId);
  const [busy, setBusy] = useState(false);
  const walkers = f.full.members.filter((m) => m.walks);

  // Calendarios en uso (con perros), el principal primero.
  const used = cals.filter((c) => c.id === MAIN || dogs.some((d) => d.calendarId === c.id));
  const cal = used.find((c) => c.id === editing) ?? used[0];
  const calName = (c: Calendar) => joinNames(dogs.filter((d) => d.calendarId === c.id).map((d) => d.name.trim() || "Sin nombre"));
  const setCal = (p: Partial<Calendar>) => setCals((cs) => cs.map((c) => (c.id === cal.id ? { ...c, ...p } : c)));
  const rotation = [...cal.rotation.filter((id) => walkers.some((w) => w.id === id)), ...walkers.filter((w) => !cal.rotation.includes(w.id)).map((w) => w.id)];
  const move = (i: number, dir: -1 | 1) => {
    const r = [...rotation];
    const j = i + dir;
    if (j < 0 || j >= r.length) return;
    [r[i], r[j]] = [r[j], r[i]];
    setCal({ rotation: r });
  };
  const setDog = (id: string, p: Partial<DogT>) => setDogs((ds) => ds.map((d) => (d.id === id ? { ...d, ...p } : d)));
  const setApart = (d: DogT, apart: boolean) => {
    if (!apart) return setDog(d.id, { calendarId: MAIN });
    const id = `cal-${d.id}`;
    if (!cals.some((c) => c.id === id)) setCals((cs) => [...cs, newCalendarFrom(cs.find((c) => c.id === MAIN)!, id, f.now.date)]);
    setDog(d.id, { calendarId: id });
  };
  const toggle = (k: keyof Family["settings"]) => setFam({ ...fam, settings: { ...fam.settings, [k]: !fam.settings[k] } });
  const valid = dogs.every((d) => d.name.trim()) && used.every((c) => c.walkTimes.length > 0);

  return (
    <Sheet open onClose={onClose} title="Perros, horarios y reglas">
      <div className="flex flex-col gap-7">
        <div>
          <span className="label">{dogs.length > 1 ? "Perros" : "Perro"}</span>
          <div className="flex flex-col gap-3">
            {dogs.map((d, i) => (
              <div key={d.id} className="card p-4">
                <div className="flex items-center gap-2">
                  <input className="field flex-1 min-w-0 font-medium" value={d.name} onChange={(e) => setDog(d.id, { name: e.target.value })} placeholder="Nombre" aria-label="Nombre del perro" />
                  {i > 0 && (
                    <button type="button" className="tap h-11 w-11 shrink-0 rounded-full text-ink-3 flex items-center justify-center" onClick={() => setDogs((ds) => ds.filter((x) => x.id !== d.id))} aria-label={`Quitar a ${d.name}`}>
                      <Trash2 size={19} />
                    </button>
                  )}
                </div>
                <div className="mt-3">
                  <CoatPicker compact value={d.coat as DogCoat} onChange={(c) => setDog(d.id, { coat: c })} />
                </div>
                {i > 0 && (
                  <div className="mt-3">
                    <Segmented
                      label="Cómo sale"
                      value={d.calendarId === MAIN ? "together" : "apart"}
                      onChange={(v) => setApart(d, v === "apart")}
                      options={[
                        { id: "together", label: `Con ${dogs[0].name.trim() || "el primero"}`, icon: <Users size={16} /> },
                        { id: "apart", label: "Aparte", icon: <Route size={16} /> },
                      ]}
                    />
                  </div>
                )}
              </div>
            ))}
            {dogs.length < 6 && (
              <button
                type="button"
                className="btn btn-dashed"
                onClick={() => setDogs((ds) => [...ds, { id: `dog-${crypto.randomUUID().slice(0, 8)}`, name: "", coat: (["brown", "golden", "gray", "black"] as DogCoat[])[(ds.length - 1) % 4], calendarId: MAIN }])}
              >
                <Plus size={18} /> Sumar otro perro
              </button>
            )}
          </div>
        </div>

        {used.length > 1 && (
          <div>
            <span className="label">¿De quién son los horarios que editás?</span>
            <div className="segmented" role="tablist">
              {used.map((c) => (
                <button key={c.id} type="button" role="tab" aria-selected={c.id === cal.id} onClick={() => setEditing(c.id)} className="!px-2 truncate">
                  {calName(c)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <span className="label">Horarios de paseo{used.length > 1 ? ` de ${calName(cal)}` : ""}</span>
          <TimesEditor times={cal.walkTimes} onChange={(walkTimes) => setCal({ walkTimes })} />
        </div>
        <div>
          <span className="label">Días fijos</span>
          <FixedDaysEditor
            days={cal.fixedDays.map((x) => (x && walkers.some((w) => w.id === x) ? x : null))}
            walkers={walkers.map((w) => ({ key: w.id, member: w }))}
            onChange={(wd, key) => setCal({ fixedDays: cal.fixedDays.map((v, j) => (j === wd ? key : v)) })}
          />
        </div>
        <div>
          <span className="label">Orden en que se turnan</span>
          <ol className="card divide-y divide-line">
            {rotation.map((id, i) => {
              const m = f.member(id)!;
              return (
                <li key={id} className="px-3 py-2 flex items-center gap-3">
                  <span className="w-5 text-center text-ink-3 font-medium tabular-nums">{i + 1}</span>
                  <Avatar member={m} size={34} />
                  <span className="flex-1 font-medium">{m.name}</span>
                  <button className="tap h-10 w-10 rounded-full bg-sunken flex items-center justify-center disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir">
                    <ChevronRight size={18} className="-rotate-90" />
                  </button>
                  <button className="tap h-10 w-10 rounded-full bg-sunken flex items-center justify-center disabled:opacity-30" disabled={i === rotation.length - 1} onClick={() => move(i, 1)} aria-label="Bajar">
                    <ChevronRight size={18} className="rotate-90" />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="card divide-y divide-line">
          <Toggle checked={fam.settings.penalty} onChange={() => toggle("penalty")} title="Paseo de deuda" text="Si nadie confirma, quien faltó saca al perro en el próximo turno de otra persona." icon={<Scale size={19} />} />
          <Toggle checked={fam.settings.insistent} onChange={() => toggle("insistent")} title="Avisos insistentes" text="Repite el aviso cada 5 minutos y después avisa al resto de la familia." icon={<Bell size={19} />} />
        </div>
        <p className="text-[0.9375rem] text-ink-3">Los cambios en días fijos y en el orden se aplican a todo el calendario. Las excepciones e intercambios que ya se hicieron se mantienen.</p>
        <button
          className="btn btn-primary btn-lg"
          disabled={busy || !valid}
          onClick={async () => {
            setBusy(true);
            try {
              const clean = cals.map((c) => (c.id === cal.id ? { ...c, rotation } : c)).map((c) => ({ ...c, walkTimes: [...new Set(c.walkTimes)] }));
              const trimmed = dogs.map((d) => ({ ...d, name: d.name.trim() }));
              await f.store.updateFamily(withCalendars(fam, clean, trimmed));
              await f.reload();
              toast("Cambios guardados.");
              onClose();
            } catch (e) {
              toast(e instanceof Error ? e.message : "No se pudo guardar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Guardar cambios
        </button>
        <DeleteFamily />
      </div>
    </Sheet>
  );
}

function Toggle({ checked, onChange, title, text, icon }: { checked: boolean; onChange: () => void; title: string; text: string; icon: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3.5 p-4 cursor-pointer">
      <IconBadge size={36}>{icon}</IconBadge>
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-[0.9375rem] text-ink-3 mt-0.5">{text}</span>
      </span>
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <span className="mt-1 relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-pine peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-sun after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" aria-hidden />
    </label>
  );
}
