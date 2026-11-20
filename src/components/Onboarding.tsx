"use client";

import { useState } from "react";
import { dayName } from "@/lib/domain/dates";
import type { Member, Role } from "@/lib/domain/types";
import type { FamilyPreview, Session, Store } from "@/lib/store/types";
import { Luke } from "./Luke";
import { AVATARS, Avatar, COLORS, DOGS, PinPad } from "./ui";

/* ================= Bienvenida ================= */

export function Welcome({ store, onJoin, onCreate, onAdmin }: { store: Store; onJoin: () => void; onCreate: () => void; onAdmin: () => void }) {
  return (
    <main className="min-h-dvh flex flex-col items-center px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-10 max-w-md mx-auto">
      <Luke mood="happy" size={210} />
      <h1 className="text-5xl font-black tracking-tight mt-2">LukeApp</h1>
      <p className="text-xl text-center text-[var(--ink-soft)] mt-2 font-semibold">
        ¿A quién le toca sacar al perro hoy?
        <br />
        Acá lo sabe toda la familia.
      </p>
      <div className="w-full mt-auto pt-10 flex flex-col gap-3">
        <button className="btn btn-primary btn-big" onClick={onJoin}>
          Entrar a mi familia
        </button>
        <button className="btn btn-white btn-big" onClick={onCreate}>
          Crear una familia nueva
        </button>
        {store.mode === "supabase" && (
          <button className="btn btn-ghost" onClick={onAdmin}>
            Soy admin y cambié de celular
          </button>
        )}
        {store.mode === "demo" && (
          <p className="text-center text-sm text-[var(--ink-soft)] mt-2">
            Modo de prueba: para ver la familia de ejemplo, entrá con el código <b>LUKE-4821</b>.
          </p>
        )}
      </div>
    </main>
  );
}

function Header({ onBack, step, total }: { onBack: () => void; step?: number; total?: number }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button className="tap h-12 w-12 rounded-full bg-white text-2xl shadow-[var(--shadow)]" onClick={onBack} aria-label="Volver">
        ←
      </button>
      {step !== undefined && total !== undefined && (
        <div className="flex gap-1.5 flex-1" aria-label={`Paso ${step + 1} de ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-[var(--orange)]" : "bg-[var(--line)]"}`} />
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
      setError("Los PIN no coinciden. Empecemos de nuevo.");
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
    <main className="min-h-dvh px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 max-w-md mx-auto">
      <Header onBack={back} />
      {!preview && (
        <>
          <h1 className="text-3xl font-black">Código de tu familia</h1>
          <p className="text-lg text-[var(--ink-soft)] mt-2">Te lo pasa quien creó la familia. Es algo como <b>LUKE-4821</b>.</p>
          <input
            className="field mt-6 text-center text-3xl tracking-widest uppercase !min-h-16"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-0000"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Código de familia"
            onKeyDown={(e) => e.key === "Enter" && code.length >= 4 && void findFamily()}
          />
          {error && <p className="mt-3 font-bold text-[var(--red)]" role="alert">{error}</p>}
          <button className="btn btn-primary btn-big mt-6" disabled={code.length < 4 || busy} onClick={() => void findFamily()}>
            Continuar
          </button>
        </>
      )}
      {preview && !who && (
        <>
          <p className="text-lg font-bold text-[var(--orange-deep)]">
            {preview.dogEmoji} {preview.familyName}
          </p>
          <h1 className="text-3xl font-black">¿Quién sos?</h1>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {preview.members.map((m) => (
              <button key={m.id} className="tap card p-5 flex flex-col items-center gap-2 active:scale-95 transition-transform" onClick={() => setWho(m)}>
                <Avatar member={m} size={76} />
                <span className="text-xl font-extrabold">{m.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {preview && who && (
        <div className="flex flex-col items-center text-center">
          <Avatar member={who} size={88} ring />
          <h1 className="text-3xl font-black mt-3">
            {who.hasPin ? `Hola, ${who.name}` : firstPin === null ? "Creá tu PIN" : "Repetilo"}
          </h1>
          <p className="text-lg text-[var(--ink-soft)] mt-1">
            {who.hasPin ? "Poné tu PIN de 4 números" : firstPin === null ? "4 números fáciles de recordar" : "Para asegurarnos"}
          </p>
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
  return (
    <main className="min-h-dvh px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 max-w-md mx-auto">
      <Header onBack={onBack} />
      <h1 className="text-3xl font-black">Entrar como admin</h1>
      <p className="text-lg text-[var(--ink-soft)] mt-2">Con el email y la contraseña que usaste al crear la familia.</p>
      <form
        className="mt-6 flex flex-col gap-4"
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
        <label>
          <span className="label">Email</span>
          <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          <span className="label">Contraseña</span>
          <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="font-bold text-[var(--red)]" role="alert">{error}</p>}
        <button className="btn btn-primary btn-big" disabled={busy}>
          Entrar
        </button>
      </form>
    </main>
  );
}

/* ================= Crear familia ================= */

type Draft = Omit<Member, "id">;

const TIME_ZONE = "America/Argentina/Buenos_Aires";

export function CreateFamily({ store, onBack, onSession }: { store: Store; onBack: () => void; onSession: (s: Session) => void }) {
  const [step, setStep] = useState(0);
  const [dogName, setDogName] = useState("");
  const [dogEmoji, setDogEmoji] = useState(DOGS[0]);
  const [times, setTimes] = useState<string[]>(["17:20"]);
  const [members, setMembers] = useState<Draft[]>([{ name: "", avatar: AVATARS[0], color: COLORS[0], role: "admin", walks: true }]);
  const [fixed, setFixed] = useState<(number | null)[]>([null, null, null, null, null, null, null]);
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const walkerIdx = members.map((m, i) => (m.walks ? i : -1)).filter((i) => i >= 0);
  const needsAccount = store.mode === "supabase";
  const TOTAL = 5;

  const canNext = [
    dogName.trim().length > 0,
    times.length > 0 && times.every((t) => /^\d{2}:\d{2}$/.test(t)),
    members.every((m) => m.name.trim()) && walkerIdx.length > 0,
    true,
    !needsAccount || (/.+@.+\..+/.test(email) && password.length >= 8),
  ][step];

  function updateMember(i: number, patch: Partial<Draft>) {
    setMembers((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  }

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
      const cleanFixed = fixed.map((f) => (f !== null && members[f]?.walks ? f : null));
      const session = await store.createFamily({
        family: {
          name: `Familia de ${members[0].name.trim()}`,
          dogName: dogName.trim(),
          dogEmoji,
          timeZone: TIME_ZONE,
          walkTimes: [...new Set(times)],
          fixedDays: cleanFixed,
          rotation: walkerIdx,
          settings: { penalty: true, insistent: true },
        },
        members: members.map((m) => ({ ...m, name: m.name.trim() })),
        adminPin: pin,
        account: needsAccount ? { email, password } : undefined,
      });
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
    <main className="min-h-dvh px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10 max-w-md mx-auto flex flex-col">
      <Header onBack={back} step={Math.min(step, TOTAL - 1)} total={TOTAL} />

      {step === 0 && (
        <section>
          <h1 className="text-3xl font-black">¿Cómo se llama tu perro?</h1>
          <input className="field mt-5 !text-2xl" value={dogName} onChange={(e) => setDogName(e.target.value)} placeholder="Luke" aria-label="Nombre del perro" autoFocus />
          <p className="label mt-6">Elegí un dibujito</p>
          <div className="flex flex-wrap gap-2">
            {DOGS.map((d) => (
              <button
                key={d}
                className={`tap h-16 w-16 rounded-2xl text-4xl ${d === dogEmoji ? "bg-[var(--orange-soft)] ring-4 ring-[var(--orange)]" : "bg-white"}`}
                onClick={() => setDogEmoji(d)}
                aria-pressed={d === dogEmoji}
              >
                {d}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 className="text-3xl font-black">¿A qué hora sale a pasear?</h1>
          <p className="text-lg text-[var(--ink-soft)] mt-2">Si sale más de una vez por día, agregá otro horario.</p>
          <div className="flex flex-col gap-3 mt-5">
            {times.map((t, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="time"
                  className="field !text-2xl flex-1"
                  value={t}
                  onChange={(e) => setTimes((ts) => ts.map((x, j) => (j === i ? e.target.value : x)))}
                  aria-label={`Horario ${i + 1}`}
                />
                {times.length > 1 && (
                  <button className="btn btn-white" onClick={() => setTimes((ts) => ts.filter((_, j) => j !== i))} aria-label="Quitar horario">
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button className="btn btn-soft" onClick={() => setTimes((ts) => [...ts, "08:00"])}>
              + Otro horario
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h1 className="text-3xl font-black">¿Quiénes son?</h1>
          <p className="text-lg text-[var(--ink-soft)] mt-2">Empezá por vos. Después sumá a los demás.</p>
          <div className="flex flex-col gap-4 mt-5">
            {members.map((m, i) => (
              <MemberEditor
                key={i}
                draft={m}
                isFirst={i === 0}
                onChange={(p) => updateMember(i, p)}
                onRemove={i > 0 ? () => setMembers((ms) => ms.filter((_, j) => j !== i)) : undefined}
              />
            ))}
            <button
              className="btn btn-soft"
              onClick={() =>
                setMembers((ms) => [...ms, { name: "", avatar: AVATARS[ms.length % AVATARS.length], color: COLORS[ms.length % COLORS.length], role: "walker", walks: true }])
              }
            >
              + Sumar a alguien
            </button>
          </div>
          {walkerIdx.length === 0 && <p className="mt-3 font-bold text-[var(--red)]">Tiene que haber al menos una persona que lo pasee.</p>}
        </section>
      )}

      {step === 3 && (
        <section>
          <h1 className="text-3xl font-black">¿Hay días fijos?</h1>
          <p className="text-lg text-[var(--ink-soft)] mt-2">
            Si alguien siempre lo saca un día, elegilo. Los días que dicen <b>“Se turnan”</b> se reparten entre todos.
          </p>
          <div className="flex flex-col gap-2 mt-5">
            {fixed.map((f, wd) => (
              <div key={wd} className="card p-3">
                <p className="font-extrabold capitalize mb-2">{dayName(wd)}</p>
                <div className="flex flex-wrap gap-2">
                  <button className={`chip !py-2 !px-3 ${f === null ? "bg-[var(--orange)] text-white" : "bg-[var(--bg-deep)]"}`} onClick={() => setFixed((x) => x.map((v, j) => (j === wd ? null : v)))} aria-pressed={f === null}>
                    🔄 Se turnan
                  </button>
                  {walkerIdx.map((i) => (
                    <button key={i} className={`chip !py-2 !px-3 ${f === i ? "bg-[var(--orange)] text-white" : "bg-[var(--bg-deep)]"}`} onClick={() => setFixed((x) => x.map((v, j) => (j === wd ? i : v)))} aria-pressed={f === i}>
                      {members[i].avatar} {members[i].name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <h1 className="text-3xl font-black">{needsAccount ? "Tu cuenta de admin" : "Casi listo"}</h1>
          {needsAccount ? (
            <>
              <p className="text-lg text-[var(--ink-soft)] mt-2">Sirve para recuperar la familia si cambiás de celular. Los demás no la necesitan.</p>
              <div className="flex flex-col gap-4 mt-5">
                <label>
                  <span className="label">Email</span>
                  <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label>
                  <span className="label">Contraseña (mínimo 8)</span>
                  <input className="field" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
              </div>
            </>
          ) : (
            <p className="text-lg text-[var(--ink-soft)] mt-2">Ahora vas a crear tu PIN de 4 números para entrar.</p>
          )}
        </section>
      )}

      {step === 5 && (
        <section className="flex flex-col items-center text-center">
          <Avatar member={members[0]} size={88} ring />
          <h1 className="text-3xl font-black mt-3">{firstPin === null ? "Creá tu PIN" : "Repetilo"}</h1>
          <p className="text-lg text-[var(--ink-soft)] mt-1">4 números fáciles de recordar</p>
          <PinPad onDone={(p) => void finish(p)} error={error} busy={busy} />
        </section>
      )}

      {step < 5 && (
        <div className="mt-auto pt-8">
          {error && <p className="mb-3 font-bold text-[var(--red)]" role="alert">{error}</p>}
          <button className="btn btn-primary btn-big" disabled={!canNext} onClick={() => setStep(step + 1)}>
            Siguiente
          </button>
        </div>
      )}
    </main>
  );
}

export function MemberEditor({
  draft,
  isFirst,
  onChange,
  onRemove,
}: {
  draft: Draft;
  isFirst?: boolean;
  onChange: (p: Partial<Draft>) => void;
  onRemove?: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const roleLabel: Record<Role, string> = { admin: "Admin", walker: "Pasea", observer: "Solo mira" };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <button className="tap rounded-full" onClick={() => setPicking((p) => !p)} aria-label="Cambiar cara">
          <Avatar member={draft} size={60} />
        </button>
        <input className="field flex-1" value={draft.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={isFirst ? "Tu nombre" : "Nombre"} aria-label="Nombre" />
        {onRemove && (
          <button className="tap h-11 w-11 rounded-full bg-[var(--bg-deep)]" onClick={onRemove} aria-label="Quitar">
            ✕
          </button>
        )}
      </div>
      {picking && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {AVATARS.map((a) => (
              <button key={a} className={`tap h-11 w-11 rounded-xl text-2xl ${draft.avatar === a ? "bg-[var(--orange-soft)]" : ""}`} onClick={() => onChange({ avatar: a })}>
                {a}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {COLORS.map((c) => (
              <button key={c} className={`tap h-9 w-9 rounded-full ${draft.color === c ? "ring-4 ring-[var(--ink)]" : ""}`} style={{ background: c }} onClick={() => onChange({ color: c })} aria-label={`Color ${c}`} />
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 mt-3">
        {isFirst ? (
          <>
            <button className={`chip !py-2 !px-3 ${draft.walks ? "bg-[var(--orange)] text-white" : "bg-[var(--bg-deep)]"}`} onClick={() => onChange({ walks: true })} aria-pressed={draft.walks}>
              🐾 Yo también lo paseo
            </button>
            <button className={`chip !py-2 !px-3 ${!draft.walks ? "bg-[var(--orange)] text-white" : "bg-[var(--bg-deep)]"}`} onClick={() => onChange({ walks: false })} aria-pressed={!draft.walks}>
              👀 Solo miro
            </button>
          </>
        ) : (
          (["walker", "observer"] as Role[]).map((r) => (
            <button
              key={r}
              className={`chip !py-2 !px-3 ${draft.role === r ? "bg-[var(--orange)] text-white" : "bg-[var(--bg-deep)]"}`}
              onClick={() => onChange({ role: r, walks: r === "walker" })}
              aria-pressed={draft.role === r}
            >
              {r === "walker" ? "🐾 " : "👀 "}
              {roleLabel[r]}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
