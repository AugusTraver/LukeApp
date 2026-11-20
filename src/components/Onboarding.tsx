"use client";

import { ArrowLeft, Eye, Footprints, Lock, Mail, MailCheck, Pencil, Plus, Route, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { allCalendars, joinNames, newCalendarFrom, withCalendars } from "@/lib/domain/calendars";
import { MAIN, type Member, type Role } from "@/lib/domain/types";
import type { FamilyPreview, Session, Store } from "@/lib/store/types";
import { AVATAR_BGS, Avatar, AvatarPicker, presetAvatar } from "./Avatar";
import { Dog, type DogCoat } from "./Dog";
import { CoatPicker, Field, FixedDaysEditor, IconInput, PasswordInput, Segmented, TimesEditor } from "./form";
import { PinPad, Sheet } from "./ui";

const shell = "min-h-dvh px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 max-w-md mx-auto flex flex-col";

/* ================= Bienvenida ================= */

export function Welcome({ store, onJoin, onCreate, onAdmin }: { store: Store; onJoin: () => void; onCreate: () => void; onAdmin: () => void }) {
  return (
    <main className={shell}>
      <p className="font-semibold text-pine tracking-tight text-lg">LukeApp</p>
      <div className="flex justify-center mt-6">
        <Dog mood="happy" size={260} />
      </div>
      <h1 className="display text-[2.6rem] mt-4">
        Una correa lista.
        <br />
        Una familia organizada.
      </h1>
      <p className="text-ink-2 text-lg mt-3 leading-relaxed">Quién saca al perro hoy, quién ya lo sacó y qué pasa si alguien no puede.</p>
      <div className="mt-auto pt-10 flex flex-col gap-3">
        <button className="btn btn-primary btn-lg" onClick={onJoin}>
          Entrar a mi familia
        </button>
        <button className="btn btn-outline btn-lg" onClick={onCreate}>
          Crear una familia
        </button>
        {store.mode === "supabase" && (
          <button className="btn btn-ghost" onClick={onAdmin}>
            Soy admin y cambié de celular
          </button>
        )}
        {store.mode === "demo" && (
          <p className="text-center text-[0.9375rem] text-ink-3 mt-2">
            Versión de prueba. Para ver una familia de ejemplo, entrá con el código <span className="font-semibold text-ink-2">LUKE-4821</span>.
          </p>
        )}
      </div>
    </main>
  );
}

function Header({ onBack, step, total }: { onBack: () => void; step?: number; total?: number }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <button className="tap h-11 w-11 rounded-full bg-surface shadow-[var(--shadow-sm)] flex items-center justify-center" onClick={onBack} aria-label="Volver">
        <ArrowLeft size={20} />
      </button>
      {step !== undefined && total !== undefined && (
        <div className="flex gap-1.5 flex-1" aria-label={`Paso ${step + 1} de ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-pine" : "bg-line"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Entrar con código ================= */

export function JoinFlow({ store, onBack, onSession }: { store: Store; onBack: () => void; onSession: (s: Session) => void }) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<FamilyPreview | null>(null);
  const [who, setWho] = useState<FamilyPreview["members"][number] | null>(null);
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function findFamily() {
    setBusy(true);
    setError(null);
    try {
      const p = await store.previewFamily(code);
      if (!p) setError("No encontramos ese código. Revisalo y probá de nuevo.");
      else setPreview(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal.");
    } finally {
      setBusy(false);
    }
  }

  async function enter(pin: string) {
    if (!preview || !who) return;
    if (!who.hasPin && firstPin === null) {
      setFirstPin(pin);
      return;
    }
    if (!who.hasPin && firstPin !== pin) {
      setError("Los PIN no coinciden. Empezá de nuevo.");
      setFirstPin(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onSession(await store.joinFamily(code, who.id, pin));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos entrar.");
    } finally {
      setBusy(false);
    }
  }

  const back = () => {
    setError(null);
    if (who) {
      setWho(null);
      setFirstPin(null);
    } else if (preview) setPreview(null);
    else onBack();
  };

  return (
    <main className={shell}>
      <Header onBack={back} />
      {!preview && (
        <>
          <h1 className="display text-[2.25rem]">Código de tu familia</h1>
          <p className="text-lg text-ink-2 mt-2">Te lo pasa quien creó la familia.</p>
          <input
            className="field mt-8 text-center !text-[1.75rem] tracking-[0.2em] uppercase !min-h-16 font-semibold"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="LUKE-0000"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Código de familia"
            onKeyDown={(e) => e.key === "Enter" && code.length >= 4 && void findFamily()}
          />
          {error && (
            <p className="mt-3 font-medium text-clay" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary btn-lg mt-auto" disabled={code.length < 4 || busy} onClick={() => void findFamily()}>
            Continuar
          </button>
        </>
      )}
      {preview && !who && (
        <>
          <div className="flex items-center gap-3">
            <Dog mood="happy" coat={preview.dogCoat as DogCoat} size={56} sun={false} />
            <p className="font-semibold text-ink-2">{preview.familyName}</p>
          </div>
          <h1 className="display text-[2.25rem] mt-4">¿Quién sos?</h1>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {preview.members.map((m) => (
              <button key={m.id} className="tap card p-5 flex flex-col items-center gap-3 active:scale-[0.98] transition-transform" onClick={() => setWho(m)}>
                <Avatar member={m} size={80} />
                <span className="text-lg font-semibold">{m.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {preview && who && (
        <div className="flex flex-col items-center text-center">
          <Avatar member={who} size={88} />
          <h1 className="display text-[2rem] mt-4">{who.hasPin ? `Hola, ${who.name}` : firstPin === null ? "Creá tu PIN" : "Repetí tu PIN"}</h1>
          <p className="text-lg text-ink-2 mt-1">{who.hasPin ? "Ingresá tu PIN de 4 números" : firstPin === null ? "Cuatro números fáciles de recordar" : "Para confirmar que está bien"}</p>
          <PinPad onDone={(p) => void enter(p)} error={error} busy={busy} />
        </div>
      )}
    </main>
  );
}

/* ================= Admin cambió de celular ================= */

export function AdminSignIn({ store, onBack, onSession }: { store: Store; onBack: () => void; onSession: (s: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "forgot" | "sent">("signin");

  if (mode !== "signin")
    return (
      <main className={shell}>
        <Header
          onBack={() => {
            setError(null);
            setMode("signin");
          }}
        />
        {mode === "sent" ? (
          <section className="flex flex-col items-center text-center">
            <span className="h-20 w-20 rounded-full bg-moss-soft text-moss flex items-center justify-center">
              <MailCheck size={36} />
            </span>
            <h1 className="display text-[2rem] mt-5">Revisá tu email</h1>
            <p className="text-lg text-ink-2 mt-2">
              Te mandamos un enlace a <span className="font-semibold text-ink break-all">{email}</span>. Abrilo desde este celular y elegí una contraseña nueva.
            </p>
            <p className="hint mt-4">Si no aparece en unos minutos, mirá en Spam o Correo no deseado.</p>
            <button className="btn btn-outline btn-lg mt-8" onClick={() => setMode("signin")}>
              Volver a entrar
            </button>
          </section>
        ) : (
          <>
            <h1 className="display text-[2.25rem]">Olvidé mi contraseña</h1>
            <p className="text-lg text-ink-2 mt-2">Escribí el email con el que creaste la familia. Te mandamos un enlace para elegir una contraseña nueva.</p>
            <form
              className="mt-8 flex flex-col gap-5 flex-1"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError(null);
                try {
                  await store.requestPasswordReset!(email);
                  setMode("sent");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "No pudimos mandar el email.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Email">
                <IconInput icon={<Mail size={19} />} type="email" inputMode="email" autoComplete="email" placeholder="nombre@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </Field>
              {error && (
                <p className="font-medium text-clay" role="alert">
                  {error}
                </p>
              )}
              <button className="btn btn-primary btn-lg mt-auto" disabled={busy || !/.+@.+[.].+/.test(email)}>
                Mandarme el enlace
              </button>
            </form>
          </>
        )}
      </main>
    );

  return (
    <main className={shell}>
      <Header onBack={onBack} />
      <h1 className="display text-[2.25rem]">Entrar como admin</h1>
      <p className="text-lg text-ink-2 mt-2">Con el email y la contraseña que usaste al crear la familia.</p>
      <form
        className="mt-8 flex flex-col gap-5 flex-1"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            onSession(await store.signInAdmin!(email, password));
          } catch (err) {
            setError(err instanceof Error ? err.message : "No pudimos entrar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Email">
          <IconInput icon={<Mail size={19} />} type="email" inputMode="email" autoComplete="email" placeholder="nombre@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Contraseña">
          <PasswordInput icon={<Lock size={19} />} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {store.requestPasswordReset && (
          <button
            type="button"
            className="self-start -mt-2 text-[0.9375rem] font-semibold text-pine underline underline-offset-4 decoration-pine/30 min-h-11"
            onClick={() => {
              setError(null);
              setMode("forgot");
            }}
          >
            Olvidé mi contraseña
          </button>
        )}
        {error && (
          <p className="font-medium text-clay" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-lg mt-auto" disabled={busy}>
          Entrar
        </button>
      </form>
    </main>
  );
}

/* ================= Contraseña nueva (desde el email) ================= */

export function NewPassword({ store, onDone, onCancel }: { store: Store; onDone: (s: Session) => void; onCancel: () => void }) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mismatch = repeat.length > 0 && repeat !== password;
  return (
    <main className={shell}>
      <Header onBack={onCancel} />
      <h1 className="display text-[2.25rem]">Elegí una contraseña nueva</h1>
      <p className="text-lg text-ink-2 mt-2">Con esta vas a entrar como admin de ahora en adelante.</p>
      <form
        className="mt-8 flex flex-col gap-5 flex-1"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            onDone(await store.updatePassword!(password));
          } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Contraseña nueva" hint={password.length > 0 && password.length < 8 ? `Faltan ${8 - password.length} caracteres.` : "Mínimo 8 caracteres."}>
          <PasswordInput icon={<Lock size={19} />} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
        <Field label="Repetila" hint={mismatch ? "No coincide con la de arriba." : undefined}>
          <PasswordInput icon={<Lock size={19} />} autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </Field>
        {error && (
          <p className="font-medium text-clay" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-lg mt-auto" disabled={busy || password.length < 8 || password !== repeat}>
          Guardar y entrar
        </button>
      </form>
    </main>
  );
}

/* ================= Crear familia ================= */

type Draft = Omit<Member, "id">;
const TIME_ZONE = "America/Argentina/Buenos_Aires";

export function newDraft(i: number, role: Role = "walker"): Draft {
  return { name: "", avatar: presetAvatar(i), color: AVATAR_BGS[i % AVATAR_BGS.length], role, walks: role !== "observer" };
}

export function CreateFamily({ store, onBack, onSession }: { store: Store; onBack: () => void; onSession: (s: Session) => void }) {
  const [step, setStep] = useState(0);
  const [dogs, setDogs] = useState<{ name: string; coat: DogCoat; apart: boolean }[]>([{ name: "", coat: "black", apart: false }]);
  const setDog = (i: number, p: Partial<{ name: string; coat: DogCoat; apart: boolean }>) => setDogs((ds) => ds.map((d, j) => (j === i ? { ...d, ...p } : d)));
  const dogName = dogs[0].name;
  const [times, setTimes] = useState<string[]>(["17:20"]);
  const [members, setMembers] = useState<Draft[]>([newDraft(0, "admin")]);
  const [fixed, setFixed] = useState<(number | null)[]>([null, null, null, null, null, null, null]);
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const walkerIdx = members.map((m, i) => (m.walks ? i : -1)).filter((i) => i >= 0);
  const needsAccount = store.mode === "supabase";
  const TOTAL = 5;
  const together = dogs.filter((d, i) => i === 0 || !d.apart);
  const dog = joinNames(together.map((d) => d.name.trim()).filter(Boolean)) || "tu perro";
  const plural = together.length > 1;

  const canNext = [
    dogs.every((d) => d.name.trim().length > 0),
    times.length > 0 && times.every((t) => /^\d{2}:\d{2}$/.test(t)),
    members.every((m) => m.name.trim()) && walkerIdx.length > 0,
    true,
    !needsAccount || (/.+@.+\..+/.test(email) && password.length >= 8),
  ][step];

  async function finish(pin: string) {
    if (firstPin === null) {
      setFirstPin(pin);
      return;
    }
    if (firstPin !== pin) {
      setError("Los PIN no coinciden. Probá de nuevo.");
      setFirstPin(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await store.createFamily({
          family: {
            name: `Familia de ${members[0].name.trim()}`,
            dogName: dogName.trim(),
            dogCoat: dogs[0].coat,
            timeZone: TIME_ZONE,
            walkTimes: [...new Set(times)],
            fixedDays: fixed.map((f) => (f !== null && members[f]?.walks ? f : null)),
            rotation: walkerIdx,
            settings: { penalty: true, insistent: true },
          },
          members: members.map((m) => ({ ...m, name: m.name.trim() })),
          adminPin: pin,
          account: needsAccount ? { email, password } : undefined,
        });
      if (dogs.length > 1) {
        // Más perros: los que salen juntos comparten calendario; los que salen aparte, uno propio.
        try {
          const { family } = await store.load(session.familyId);
          const main = allCalendars(family)[0];
          const ds = dogs.map((d, i) => ({ id: `dog-${i + 1}`, name: d.name.trim(), coat: d.coat, calendarId: i > 0 && d.apart ? `cal-${i + 1}` : MAIN }));
          const cals = [main, ...ds.filter((d) => d.calendarId !== MAIN).map((d) => newCalendarFrom(main, d.calendarId))];
          await store.updateFamily(withCalendars(family, cals, ds));
        } catch {
          /* la familia ya está creada: los perros se pueden sumar después desde Reglas */
        }
      }
      onSession(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos crear la familia.");
      setFirstPin(null);
    } finally {
      setBusy(false);
    }
  }

  const back = () => {
    setError(null);
    if (step === 5) {
      setFirstPin(null);
      setStep(4);
    } else if (step > 0) setStep(step - 1);
    else onBack();
  };

  return (
    <main className={shell}>
      <Header onBack={back} step={Math.min(step, TOTAL - 1)} total={TOTAL} />

      {step === 0 && (
        <section>
          <h1 className="display text-[2.25rem]">{dogs.length > 1 ? "¿Cómo se llaman tus perros?" : "¿Cómo se llama tu perro?"}</h1>
          <p className="text-lg text-ink-2 mt-2">Así los va a llamar la app en los avisos.</p>
          <Field label="Nombre" className="mt-6">
            <input className="field !text-xl font-medium" value={dogs[0].name} onChange={(e) => setDog(0, { name: e.target.value })} placeholder="Por ejemplo, Luke" autoFocus />
          </Field>
          <p className="label mt-7">Pelaje</p>
          <CoatPicker value={dogs[0].coat} onChange={(c) => setDog(0, { coat: c })} />

          {dogs.slice(1).map((d, k) => {
            const i = k + 1;
            return (
              <div key={i} className="card p-4 mt-4">
                <div className="flex items-center gap-2">
                  <input className="field flex-1 min-w-0 font-medium" value={d.name} onChange={(e) => setDog(i, { name: e.target.value })} placeholder={`Nombre del perro ${i + 1}`} aria-label={`Nombre del perro ${i + 1}`} />
                  <button type="button" className="tap h-11 w-11 shrink-0 rounded-full text-ink-3 flex items-center justify-center" onClick={() => setDogs((ds) => ds.filter((_, j) => j !== i))} aria-label="Quitar perro">
                    <Trash2 size={19} />
                  </button>
                </div>
                <div className="mt-3">
                  <CoatPicker compact value={d.coat} onChange={(c) => setDog(i, { coat: c })} />
                </div>
                <p className="label mt-4">¿Cómo sale?</p>
                <Segmented
                  label="Cómo sale"
                  value={d.apart ? "apart" : "together"}
                  onChange={(v) => setDog(i, { apart: v === "apart" })}
                  options={[
                    { id: "together", label: `Con ${dogs[0].name.trim() || "el primero"}`, icon: <Users size={16} /> },
                    { id: "apart", label: "Aparte", icon: <Route size={16} /> },
                  ]}
                />
                <p className="hint">{d.apart ? "Tiene sus propios horarios y turnos. Los configurás en Reglas de la familia." : "Comparten el paseo: el mismo horario y la misma persona."}</p>
              </div>
            );
          })}
          {dogs.length < 6 && (
            <button type="button" className="btn btn-dashed w-full mt-4" onClick={() => setDogs((ds) => [...ds, { name: "", coat: (["brown", "golden", "gray", "black"] as DogCoat[])[(ds.length - 1) % 4], apart: false }])}>
              <Plus size={18} /> Sumar otro perro
            </button>
          )}
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 className="display text-[2.25rem]">
            ¿A qué hora {plural ? "salen" : "sale"} {dog}?
          </h1>
          <p className="text-lg text-ink-2 mt-2">Si {plural ? "salen" : "sale"} más de una vez por día, sumá otro horario.</p>
          {dogs.some((d, i) => i > 0 && d.apart) && (
            <p className="hint mt-2">
              {joinNames(dogs.filter((d, i) => i > 0 && d.apart).map((d) => d.name.trim()))} empieza con estos mismos horarios y turnos. Después los cambiás en Reglas de la familia.
            </p>
          )}
          <div className="mt-6">
            <TimesEditor times={times} onChange={setTimes} large />
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h1 className="display text-[2.25rem]">¿Quiénes son?</h1>
          <p className="text-lg text-ink-2 mt-2">Empezá por vos y después sumá a los demás.</p>
          <div className="flex flex-col gap-3 mt-6">
            {members.map((m, i) => (
              <MemberEditor
                key={i}
                draft={m}
                isFirst={i === 0}
                onChange={(p) => setMembers((ms) => ms.map((x, j) => (j === i ? { ...x, ...p } : x)))}
                onRemove={i > 0 ? () => setMembers((ms) => ms.filter((_, j) => j !== i)) : undefined}
              />
            ))}
            <button className="btn btn-dashed" onClick={() => setMembers((ms) => [...ms, newDraft(ms.length)])}>
              <Plus size={18} /> Sumar a alguien
            </button>
          </div>
          {walkerIdx.length === 0 && <p className="mt-3 font-medium text-clay">Tiene que haber al menos una persona que lo saque.</p>}
        </section>
      )}

      {step === 3 && (
        <section>
          <h1 className="display text-[2.25rem]">¿Alguien tiene un día fijo?</h1>
          <p className="text-lg text-ink-2 mt-2">Tocá una cara para que ese día lo saque siempre la misma persona. El resto se reparte en orden.</p>
          <div className="mt-6">
            <FixedDaysEditor
              days={fixed.map((f) => (f !== null && members[f]?.walks ? String(f) : null))}
              walkers={walkerIdx.map((i) => ({ key: String(i), member: members[i] }))}
              onChange={(wd, key) => setFixed((x) => x.map((v, j) => (j === wd ? (key === null ? null : Number(key)) : v)))}
            />
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <h1 className="display text-[2.25rem]">{needsAccount ? "Tu cuenta de admin" : "Último paso"}</h1>
          {needsAccount ? (
            <>
              <p className="text-lg text-ink-2 mt-2">Sirve para recuperar la familia si cambiás de celular. Los demás entran solo con el código y su PIN.</p>
              <div className="flex flex-col gap-5 mt-6">
                <Field label="Email">
                  <IconInput icon={<Mail size={19} />} type="email" inputMode="email" autoComplete="email" placeholder="nombre@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Contraseña" hint={password.length > 0 && password.length < 8 ? `Faltan ${8 - password.length} caracteres.` : "Mínimo 8 caracteres."}>
                  <PasswordInput icon={<Lock size={19} />} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
              </div>
            </>
          ) : (
            <p className="text-lg text-ink-2 mt-2">Ahora vas a crear tu PIN de 4 números para entrar a la app.</p>
          )}
        </section>
      )}

      {step === 5 && (
        <section className="flex flex-col items-center text-center">
          <Avatar member={members[0]} size={88} />
          <h1 className="display text-[2rem] mt-4">{firstPin === null ? "Creá tu PIN" : "Repetí tu PIN"}</h1>
          <p className="text-lg text-ink-2 mt-1">Cuatro números fáciles de recordar</p>
          <PinPad onDone={(p) => void finish(p)} error={error} busy={busy} />
        </section>
      )}

      {step < 5 && (
        <div className="mt-auto pt-8">
          {error && (
            <p className="mb-3 font-medium text-clay" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary btn-lg" disabled={!canNext} onClick={() => setStep(step + 1)}>
            Continuar
          </button>
        </div>
      )}
    </main>
  );
}

export function MemberEditor({ draft, isFirst, onChange, onRemove }: { draft: Draft; isFirst?: boolean; onChange: (p: Partial<Draft>) => void; onRemove?: () => void }) {
  const [picking, setPicking] = useState(false);
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3.5">
        <button type="button" className="tap rounded-full relative shrink-0" onClick={() => setPicking(true)} aria-label="Cambiar avatar">
          <Avatar member={draft} size={60} />
          <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-pine text-white flex items-center justify-center ring-[2.5px] ring-white">
            <Pencil size={12} strokeWidth={2.5} />
          </span>
        </button>
        <input className="field flex-1 min-w-0" value={draft.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={isFirst ? "Tu nombre" : "Nombre"} aria-label="Nombre" />
        {onRemove && (
          <button type="button" className="tap h-11 w-11 -mr-1 shrink-0 rounded-full text-ink-3 flex items-center justify-center" onClick={onRemove} aria-label="Quitar">
            <Trash2 size={19} />
          </button>
        )}
      </div>
      <div className="mt-3.5">
        <Segmented
          label="Qué hace"
          value={draft.walks ? "walks" : "watches"}
          onChange={(v) => onChange(v === "walks" ? (isFirst ? { walks: true } : { role: "walker", walks: true }) : isFirst ? { walks: false } : { role: "observer", walks: false })}
          options={[
            { id: "walks", label: isFirst ? "Lo saco" : "Lo saca", icon: <Footprints size={17} /> },
            { id: "watches", label: isFirst ? "Solo miro" : "Solo mira", icon: <Eye size={17} /> },
          ]}
        />
      </div>
      <Sheet open={picking} onClose={() => setPicking(false)} title="Avatar">
        <AvatarPicker value={draft.avatar} color={draft.color} name={draft.name} onChange={(p) => onChange(p)} />
        <button className="btn btn-primary btn-lg mt-4" onClick={() => setPicking(false)}>
          Listo
        </button>
      </Sheet>
    </div>
  );
}
