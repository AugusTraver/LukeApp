"use client";

import { Bell, CalendarDays, ChevronRight, CircleHelp, Copy, KeyRound, LogOut, Plus, Scale, Settings2, Share2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { dayName } from "@/lib/domain/dates";
import type { Family, Member } from "@/lib/domain/types";
import { useFamily } from "@/lib/useFamily";
import { Avatar } from "./Avatar";
import { BallGame } from "./BallGame";
import { Dog, type DogCoat } from "./Dog";
import { CoatPicker, Field, FixedDaysEditor, TimesEditor } from "./form";
import { NotificationsCard } from "./Notifications";
import { MemberEditor, newDraft } from "./Onboarding";
import { IconBadge, Sheet } from "./ui";

export function FamilyTab({ toast }: { toast: (m: string) => void }) {
  const f = useFamily();
  const { data, me, isAdmin } = f;
  const [sheet, setSheet] = useState<null | "how" | "game" | "settings" | { member: Member | null }>(null);
  const coat = data.family.dogCoat as DogCoat;

  const roleText = (m: Member) => {
    const fixed = data.family.fixedDays.map((x, i) => (x === m.id ? dayName(i) : null)).filter(Boolean);
    const base = m.role === "admin" ? (m.walks ? "Admin, lo saca" : "Admin") : m.walks ? "Lo saca" : "Solo mira";
    return fixed.length ? `${base}. Fijo los ${fixed.join(" y ")}` : base;
  };

  async function share() {
    const text = `Sumate a ${data.family.name} en LukeApp para organizar los paseos de ${data.family.dogName}.\nCódigo: ${data.family.joinCode}\n${location.origin}`;
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
        <span className="h-20 w-20 rounded-full bg-pine flex items-end justify-center overflow-hidden shrink-0">
          <Dog mood="happy" coat={coat} size={92} sun={false} className="translate-y-2" />
        </span>
        <div className="min-w-0">
          <h1 className="display text-[2rem] truncate">{data.family.name}</h1>
          <p className="text-ink-2">
            {data.family.dogName} sale a las {data.family.walkTimes.join(" y a las ")}
          </p>
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
              <button className="tap w-full flex items-center gap-3.5 px-5 py-3 text-left disabled:cursor-default active:bg-sunken" disabled={!isAdmin} onClick={() => setSheet({ member: m })}>
                <Avatar member={m} size={46} />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">
                    {m.name}
                    {m.id === me.id && <span className="font-normal text-ink-3"> (vos)</span>}
                  </span>
                  <span className="block text-[0.9375rem] text-ink-3">{roleText(m)}</span>
                </span>
                {isAdmin && <ChevronRight size={20} className="text-ink-3" />}
              </button>
            </li>
          ))}
        </ul>
        {isAdmin && (
          <div className="p-4 pt-2">
            <button className="btn btn-soft w-full" onClick={() => setSheet({ member: null })}>
              <Plus size={18} /> Sumar a alguien
            </button>
          </div>
        )}
      </section>

      <section className="card overflow-hidden divide-y divide-line">
        <Row icon={<Dog mood="happy" coat={coat} size={30} sun={false} />} label={`Jugar con ${data.family.dogName}`} onClick={() => setSheet("game")} />
        <Row icon={<CircleHelp size={20} />} label="¿Cómo funciona?" onClick={() => setSheet("how")} />
        {isAdmin && <Row icon={<Settings2 size={20} />} label="Horarios, días fijos y reglas" onClick={() => setSheet("settings")} />}
        <Row icon={<LogOut size={20} />} label="Salir o cambiar de persona" onClick={() => void f.signOut()} />
      </section>

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

function Row({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="tap w-full flex items-center gap-3.5 px-5 py-4 text-left active:bg-sunken" onClick={onClick}>
      <span className="h-9 w-9 rounded-full bg-pine-soft text-pine flex items-center justify-center shrink-0 overflow-hidden">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
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

function MemberSheet({ member, onClose, toast }: { member: Member | null; onClose: () => void; toast: (m: string) => void }) {
  const f = useFamily();
  const isNew = !member;
  const [draft, setDraft] = useState<Omit<Member, "id">>(member ?? newDraft(f.data.members.length));
  const [busy, setBusy] = useState(false);
  const isMe = member?.id === f.me.id;

  async function save() {
    setBusy(true);
    try {
      const saved = await f.store.saveMember(f.data.family.id, { ...draft, id: member?.id ?? "", name: draft.name.trim() });
      const fam = f.data.family;
      const inRotation = fam.rotation.includes(saved.id);
      if (saved.walks && !inRotation) await f.store.updateFamily({ ...fam, rotation: [...fam.rotation, saved.id] });
      if (!saved.walks && inRotation)
        await f.store.updateFamily({ ...fam, rotation: fam.rotation.filter((x) => x !== saved.id), fixedDays: fam.fixedDays.map((x) => (x === saved.id ? null : x)) });
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
      {!isNew && !isMe && (
        <div className="flex flex-col gap-1 mt-4">
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await f.store.resetPin(f.data.family.id, member.id);
              toast(`${member.name} va a poder crear un PIN nuevo.`);
            }}
          >
            <KeyRound size={18} /> Se olvidó el PIN
          </button>
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (!confirm(`¿Sacar a ${member.name} de la familia?`)) return;
              await f.store.removeMember(f.data.family.id, member.id);
              await f.reload();
              onClose();
            }}
          >
            <Trash2 size={18} /> Sacar de la familia
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
      <div className="flex flex-col gap-7">
        <Field label="Nombre del perro">
          <input className="field" value={fam.dogName} onChange={(e) => setFam({ ...fam, dogName: e.target.value })} />
        </Field>
        <div>
          <span className="label">Pelaje</span>
          <CoatPicker compact value={fam.dogCoat as DogCoat} onChange={(c) => setFam({ ...fam, dogCoat: c })} />
        </div>
        <div>
          <span className="label">Horarios de paseo</span>
          <TimesEditor times={fam.walkTimes} onChange={(walkTimes) => setFam({ ...fam, walkTimes })} />
        </div>
        <div>
          <span className="label">Días fijos</span>
          <FixedDaysEditor
            days={fam.fixedDays.map((x) => (x && walkers.some((w) => w.id === x) ? x : null))}
            walkers={walkers.map((w) => ({ key: w.id, member: w }))}
            onChange={(wd, key) => setFam({ ...fam, fixedDays: fam.fixedDays.map((v, j) => (j === wd ? key : v)) })}
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
          disabled={busy || !fam.dogName.trim() || fam.walkTimes.length === 0}
          onClick={async () => {
            setBusy(true);
            try {
              await f.store.updateFamily({ ...fam, rotation, walkTimes: [...new Set(fam.walkTimes)] });
              await f.reload();
              toast("Cambios guardados.");
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          Guardar cambios
        </button>
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
