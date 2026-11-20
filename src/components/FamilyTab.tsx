"use client";

import { useState } from "react";
import { dayName } from "@/lib/domain/dates";
import type { Family, Member } from "@/lib/domain/types";
import { useFamily } from "@/lib/useFamily";
import { BallGame } from "./BallGame";
import { Luke } from "./Luke";
import { NotificationsCard } from "./Notifications";
import { MemberEditor } from "./Onboarding";
import { AVATARS, Avatar, COLORS, Sheet } from "./ui";

export function FamilyTab({ toast }: { toast: (m: string) => void }) {
  const f = useFamily();
  const { data, me, isAdmin } = f;
  const [sheet, setSheet] = useState<null | "how" | "game" | "settings" | { member: Member | null }>(null);
  const roleText = (m: Member) => (m.role === "admin" ? (m.walks ? "Admin · pasea" : "Admin") : m.role === "walker" ? "Pasea" : "Solo mira");

  async function share() {
    const text = `Sumate a ${data.family.name} en LukeApp para organizar los paseos de ${data.family.dogName} 🐾\nCódigo: ${data.family.joinCode}\n${location.origin}`;
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
    <div className="flex flex-col gap-4">
      <header className="pt-2 flex items-center gap-3">
        <span className="text-5xl" aria-hidden>
          {data.family.dogEmoji}
        </span>
        <div>
          <h1 className="text-3xl font-black leading-tight">{data.family.name}</h1>
          <p className="text-[var(--ink-soft)] font-bold">
            {data.family.dogName} pasea a las {data.family.walkTimes.join(" y ")}
          </p>
        </div>
      </header>

      <NotificationsCard toast={toast} />

      <section className="card p-4">
        <h2 className="text-xl font-black">Invitar a la familia</h2>
        <p className="text-[var(--ink-soft)] font-semibold">Mandales este código. Lo ponen en “Entrar a mi familia”.</p>
        <div className="flex items-center gap-3 mt-3">
          <span className="flex-1 min-w-0 text-center text-2xl font-black tracking-wider whitespace-nowrap bg-[var(--bg-deep)] rounded-2xl py-3">{data.family.joinCode}</span>
          <button className="btn btn-primary" onClick={() => void share()}>
            Compartir
          </button>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="text-xl font-black mb-2">Quiénes somos</h2>
        <ul className="flex flex-col">
          {data.members.map((m) => (
            <li key={m.id}>
              <button className="tap w-full flex items-center gap-3 py-2 text-left disabled:cursor-default" disabled={!isAdmin} onClick={() => setSheet({ member: m })}>
                <Avatar member={m} size={46} />
                <span className="flex-1">
                  <span className="block font-extrabold text-lg">
                    {m.name} {m.id === me.id && <span className="text-[var(--ink-soft)] font-bold">(vos)</span>}
                  </span>
                  <span className="block text-sm font-bold text-[var(--ink-soft)]">
                    {roleText(m)}
                    {data.family.fixedDays.some((x) => x === m.id) &&
                      ` · fijo los ${data.family.fixedDays
                        .map((x, i) => (x === m.id ? dayName(i) : null))
                        .filter(Boolean)
                        .join(", ")}`}
                  </span>
                </span>
                {isAdmin && <span className="text-[var(--ink-soft)]">›</span>}
              </button>
            </li>
          ))}
        </ul>
        {isAdmin && (
          <button className="btn btn-soft w-full mt-2" onClick={() => setSheet({ member: null })}>
            + Sumar a alguien
          </button>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button className="tap card p-4 flex flex-col items-center gap-1" onClick={() => setSheet("game")}>
          <span className="text-4xl" aria-hidden>
            🎾
          </span>
          <span className="font-extrabold">Jugar con {data.family.dogName}</span>
        </button>
        <button className="tap card p-4 flex flex-col items-center gap-1" onClick={() => setSheet("how")}>
          <span className="text-4xl" aria-hidden>
            💡
          </span>
          <span className="font-extrabold">¿Cómo funciona?</span>
        </button>
      </div>

      {isAdmin && (
        <button className="btn btn-white" onClick={() => setSheet("settings")}>
          ⚙️ Horarios, días fijos y reglas
        </button>
      )}
      <button className="btn btn-ghost" onClick={() => void f.signOut()}>
        Salir / cambiar de persona
      </button>

      <Sheet open={sheet === "how"} onClose={() => setSheet(null)} title="¿Cómo funciona?">
        <HowItWorks family={data.family} />
      </Sheet>
      <Sheet open={sheet === "game"} onClose={() => setSheet(null)} title={`Jugá con ${data.family.dogName}`}>
        <BallGame />
      </Sheet>
      {sheet === "settings" && <SettingsSheet onClose={() => setSheet(null)} toast={toast} />}
      {typeof sheet === "object" && sheet !== null && <MemberSheet member={sheet.member} onClose={() => setSheet(null)} toast={toast} />}
    </div>
  );
}

function HowItWorks({ family }: { family: Family }) {
  const steps = [
    ["📅", "Cada día tiene a alguien", "La app reparte los paseos. Algunos días son fijos y el resto se turnan."],
    ["🔔", "Te avisamos", "10 minutos antes y a la hora. Si no confirmás, insistimos hasta que lo hagas."],
    ["✅", "Lo sacás y tocás “Ya lo saqué”", "Así todos saben que el perro paseó."],
    ["🙅", "¿No podés? Avisá antes", "El paseo pasa a otra persona al instante. O pedí un cambio de día."],
    ...(family.settings.penalty ? [["🐾", "Si nadie confirma…", `${family.dogName} se queda esperando y quien faltó carga con el próximo paseo de otra persona.`]] : []),
    ["🔥", "La racha", "Cuántos días seguidos paseó sin falta. ¡Que no se corte!"],
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <Luke mood="happy" size={120} />
      </div>
      {steps.map(([icon, title, text]) => (
        <div key={title} className="flex gap-3">
          <span className="text-3xl" aria-hidden>
            {icon}
          </span>
          <div>
            <p className="font-extrabold text-lg">{title}</p>
            <p className="text-[var(--ink-soft)] font-semibold">{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MemberSheet({ member, onClose, toast }: { member: Member | null; onClose: () => void; toast: (m: string) => void }) {
  const f = useFamily();
  const isNew = !member;
  const [draft, setDraft] = useState<Omit<Member, "id">>(
    member ?? { name: "", avatar: AVATARS[f.data.members.length % AVATARS.length], color: COLORS[f.data.members.length % COLORS.length], role: "walker", walks: true },
  );
  const [busy, setBusy] = useState(false);
  const isMe = member?.id === f.me.id;

  async function save() {
    setBusy(true);
    try {
      const saved = await f.store.saveMember(f.data.family.id, { ...draft, id: member?.id ?? "", name: draft.name.trim() });
      // Mantener la rotación al día con quién pasea
      const fam = f.data.family;
      const inRotation = fam.rotation.includes(saved.id);
      if (saved.walks && !inRotation) await f.store.updateFamily({ ...fam, rotation: [...fam.rotation, saved.id] });
      if (!saved.walks && inRotation)
        await f.store.updateFamily({ ...fam, rotation: fam.rotation.filter((x) => x !== saved.id), fixedDays: fam.fixedDays.map((x) => (x === saved.id ? null : x)) });
      await f.reload();
      toast(isNew ? `Listo. Pasale el código a ${saved.name}.` : "Guardado.");
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
      <button className="btn btn-primary btn-big mt-4" disabled={!draft.name.trim() || busy} onClick={() => void save()}>
        Guardar
      </button>
      {!isNew && !isMe && (
        <div className="flex flex-col gap-2 mt-4">
          <button
            className="btn btn-white"
            onClick={async () => {
              await f.store.resetPin(f.data.family.id, member.id);
              toast(`${member.name} va a poder crear un PIN nuevo.`);
            }}
          >
            🔑 Se olvidó el PIN
          </button>
          <button
            className="btn btn-ghost !text-[var(--red)]"
            onClick={async () => {
              if (!confirm(`¿Sacar a ${member.name} de la familia?`)) return;
              await f.store.removeMember(f.data.family.id, member.id);
              await f.reload();
              onClose();
            }}
          >
            Sacar de la familia
          </button>
        </div>
      )}
    </Sheet>
  );
}

function SettingsSheet({ onClose, toast }: { onClose: () => void; toast: (m: string) => void }) {
  const f = useFamily();
  const [fam, setFam] = useState<Family>(structuredClone(f.data.family));
  const [busy, setBusy] = useState(false);
  const walkers = f.data.members.filter((m) => m.walks);
  const rotation = fam.rotation.filter((id) => walkers.some((w) => w.id === id));
  const move = (i: number, dir: -1 | 1) => {
    const r = [...rotation];
    const j = i + dir;
    if (j < 0 || j >= r.length) return;
    [r[i], r[j]] = [r[j], r[i]];
    setFam({ ...fam, rotation: r });
  };
  const toggle = (k: keyof Family["settings"]) => setFam({ ...fam, settings: { ...fam.settings, [k]: !fam.settings[k] } });

  return (
    <Sheet open onClose={onClose} title="Reglas de la familia">
      <div className="flex flex-col gap-5">
        <label>
          <span className="label">Nombre del perro</span>
          <input className="field" value={fam.dogName} onChange={(e) => setFam({ ...fam, dogName: e.target.value })} />
        </label>
        <div>
          <span className="label">Horarios de paseo</span>
          <div className="flex flex-col gap-2">
            {fam.walkTimes.map((t, i) => (
              <div key={i} className="flex gap-2">
                <input type="time" className="field flex-1" value={t} onChange={(e) => setFam({ ...fam, walkTimes: fam.walkTimes.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={`Horario ${i + 1}`} />
                {fam.walkTimes.length > 1 && (
                  <button className="btn btn-white" onClick={() => setFam({ ...fam, walkTimes: fam.walkTimes.filter((_, j) => j !== i) })} aria-label="Quitar">
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button className="btn btn-soft" onClick={() => setFam({ ...fam, walkTimes: [...fam.walkTimes, "08:00"] })}>
              + Otro horario
            </button>
          </div>
        </div>
        <div>
          <span className="label">Días fijos</span>
          <div className="flex flex-col gap-2">
            {fam.fixedDays.map((x, wd) => (
              <div key={wd} className="flex items-center gap-2">
                <span className="w-24 font-bold capitalize">{dayName(wd)}</span>
                <select className="field flex-1 !min-h-11" value={x ?? ""} onChange={(e) => setFam({ ...fam, fixedDays: fam.fixedDays.map((v, j) => (j === wd ? e.target.value || null : v)) })}>
                  <option value="">🔄 Se turnan</option>
                  {walkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.avatar} {w.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Orden en que se turnan</span>
          <ol className="flex flex-col gap-2">
            {rotation.map((id, i) => {
              const m = f.member(id)!;
              return (
                <li key={id} className="card p-2 flex items-center gap-2">
                  <span className="w-6 text-center font-black">{i + 1}</span>
                  <Avatar member={m} size={34} />
                  <span className="flex-1 font-bold">{m.name}</span>
                  <button className="tap h-10 w-10 rounded-full bg-[var(--bg-deep)]" onClick={() => move(i, -1)} aria-label="Subir">
                    ↑
                  </button>
                  <button className="tap h-10 w-10 rounded-full bg-[var(--bg-deep)]" onClick={() => move(i, 1)} aria-label="Bajar">
                    ↓
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
        <label className="card p-4 flex items-center gap-3">
          <input type="checkbox" className="h-6 w-6 accent-[var(--orange)]" checked={fam.settings.penalty} onChange={() => toggle("penalty")} />
          <span>
            <span className="block font-extrabold">🐾 Paseo de deuda</span>
            <span className="block text-sm font-semibold text-[var(--ink-soft)]">Si nadie confirma, quien faltó carga con el próximo paseo de otra persona.</span>
          </span>
        </label>
        <label className="card p-4 flex items-center gap-3">
          <input type="checkbox" className="h-6 w-6 accent-[var(--orange)]" checked={fam.settings.insistent} onChange={() => toggle("insistent")} />
          <span>
            <span className="block font-extrabold">🔔 Avisos insistentes</span>
            <span className="block text-sm font-semibold text-[var(--ink-soft)]">Repite el aviso cada 5 minutos y después avisa a los demás.</span>
          </span>
        </label>
        <p className="text-sm text-[var(--ink-soft)] font-semibold">Los cambios en días fijos y orden se aplican a todo el calendario. Las excepciones e intercambios ya hechos se mantienen.</p>
        <button
          className="btn btn-primary btn-big"
          disabled={busy || !fam.dogName.trim() || fam.walkTimes.length === 0}
          onClick={async () => {
            setBusy(true);
            try {
              await f.store.updateFamily({ ...fam, rotation, walkTimes: [...new Set(fam.walkTimes)] });
              await f.reload();
              toast("Guardado.");
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          Guardar
        </button>
      </div>
    </Sheet>
  );
}
