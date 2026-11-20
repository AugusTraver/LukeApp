"use client";

import { ArrowLeft, Eye, Footprints, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { dayName, cap } from "@/lib/domain/dates";
import type { Member, Role } from "@/lib/domain/types";
import type { FamilyPreview, Session, Store } from "@/lib/store/types";
import { AVATAR_BGS, AVATAR_SEEDS, Avatar, AvatarPicker } from "./Avatar";
import { COATS, Dog, type DogCoat } from "./Dog";
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
        <label>
          <span className="label">Email</span>
          <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          <span className="label">Contraseña</span>
          <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
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

/* ================= Crear familia ================= */

type Draft = Omit<Member, "id">;
const TIME_ZONE = "America/Argentina/Buenos_Aires";

export function newDraft(i: number, role: Role = "walker"): Draft {
  return { name: "", avatar: AVATAR_SEEDS[i % AVATAR_SEEDS.length], color: AVATAR_BGS[i % AVATAR_BGS.length], role, walks: role !== "observer" };
}

export function CreateFamily({ store, onBack, onSession }: { store: Store; onBack: () => void; onSession: (s: Session) => void }) {
  const [step, setStep] = useState(0);
  const [dogName, setDogName] = useState("");
  const [coat, setCoat] = useState<DogCoat>("black");
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
  const dog = dogName.trim() || "tu perro";

  const canNext = [
    dogName.trim().length > 0,
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
      onSession(
        await store.createFamily({
          family: {
            name: `Familia de ${members[0].name.trim()}`,
            dogName: dogName.trim(),
            dogCoat: coat,
            timeZone: TIME_ZONE,
            walkTimes: [...new Set(times)],
            fixedDays: fixed.map((f) => (f !== null && members[f]?.walks ? f : null)),
            rotation: walkerIdx,
            settings: { penalty: true, insistent: true },
          },
          members: members.map((m) => ({ ...m, name: m.name.trim() })),
          adminPin: pin,
          account: needsAccount ? { email, password } : undefined,
        }),
      );
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
          <h1 className="display text-[2.25rem]">¿Cómo se llama tu perro?</h1>
          <input className="field mt-6 !text-xl" value={dogName} onChange={(e) => setDogName(e.target.value)} placeholder="Luke" aria-label="Nombre del perro" autoFocus />
          <p className="label mt-8">¿Cómo es su pelaje?</p>
          <div className="grid grid-cols-2 gap-3">
            {COATS.map((c) => (
              <button
                key={c.id}
                className={`tap card p-3 flex flex-col items-center gap-1 border-2 transition-colors ${coat === c.id ? "border-pine" : "border-transparent"}`}
                onClick={() => setCoat(c.id)}
                aria-pressed={coat === c.id}
              >
                <Dog mood="happy" coat={c.id} size={92} sun={false} />
                <span className="font-medium text-[0.9375rem]">{c.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h1 className="display text-[2.25rem]">¿A qué hora sale {dog}?</h1>
          <p className="text-lg text-ink-2 mt-2">Si sale más de una vez por día, sumá otro horario.</p>
          <div className="flex flex-col gap-3 mt-6">
            {times.map((t, i) => (
              <div key={i} className="flex gap-2">
                <input type="time" className="field !text-2xl flex-1 font-medium" value={t} onChange={(e) => setTimes((ts) => ts.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Horario ${i + 1}`} />
                {times.length > 1 && (
                  <button className="btn btn-outline !px-4" onClick={() => setTimes((ts) => ts.filter((_, j) => j !== i))} aria-label="Quitar horario">
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
            <button className="btn btn-soft" onClick={() => setTimes((ts) => [...ts, "08:00"])}>
              <Plus size={18} /> Sumar otro horario
            </button>
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
            <button className="btn btn-soft" onClick={() => setMembers((ms) => [...ms, newDraft(ms.length)])}>
              <Plus size={18} /> Sumar a alguien
            </button>
          </div>
          {walkerIdx.length === 0 && <p className="mt-3 font-medium text-clay">Tiene que haber al menos una persona que lo saque.</p>}
        </section>
      )}

      {step === 3 && (
        <section>
          <h1 className="display text-[2.25rem]">¿Alguien tiene un día fijo?</h1>
          <p className="text-lg text-ink-2 mt-2">Los días que se turnan se reparten en orden entre todos los que pasean.</p>
          <div className="card mt-6 divide-y divide-line">
            {fixed.map((f, wd) => (
              <div key={wd} className="px-4 py-3.5">
                <p className="font-semibold mb-2.5">{cap(dayName(wd))}</p>
                <div className="flex flex-wrap gap-2">
                  <button className="option" onClick={() => setFixed((x) => x.map((v, j) => (j === wd ? null : v)))} aria-pressed={f === null}>
                    Se turnan
                  </button>
                  {walkerIdx.map((i) => (
                    <button key={i} className="option !pl-1.5" onClick={() => setFixed((x) => x.map((v, j) => (j === wd ? i : v)))} aria-pressed={f === i}>
                      <Avatar member={members[i]} size={30} /> {members[i].name}
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
          <h1 className="display text-[2.25rem]">{needsAccount ? "Tu cuenta de admin" : "Último paso"}</h1>
          {needsAccount ? (
            <>
              <p className="text-lg text-ink-2 mt-2">Sirve para recuperar la familia si cambiás de celular. Los demás entran solo con el código y su PIN.</p>
              <div className="flex flex-col gap-5 mt-6">
                <label>
                  <span className="label">Email</span>
                  <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label>
                  <span className="label">Contraseña (mínimo 8 caracteres)</span>
                  <input className="field" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
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
      <div className="flex items-center gap-3">
        <button className="tap rounded-full relative" onClick={() => setPicking(true)} aria-label="Cambiar cara">
          <Avatar member={draft} size={56} />
          <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-pine text-white flex items-center justify-center ring-2 ring-white">
            <Plus size={12} strokeWidth={3} />
          </span>
        </button>
        <input className="field flex-1" value={draft.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={isFirst ? "Tu nombre" : "Nombre"} aria-label="Nombre" />
        {onRemove && (
          <button className="tap h-11 w-11 rounded-full text-ink-3 flex items-center justify-center" onClick={onRemove} aria-label="Quitar">
            <Trash2 size={19} />
          </button>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <button className="option" onClick={() => onChange(isFirst ? { walks: true } : { role: "walker", walks: true })} aria-pressed={draft.walks}>
          <Footprints size={17} /> {isFirst ? "Yo también lo saco" : "Lo saca"}
        </button>
        <button className="option" onClick={() => onChange(isFirst ? { walks: false } : { role: "observer", walks: false })} aria-pressed={!draft.walks}>
          <Eye size={17} /> Solo mira
        </button>
      </div>
      <Sheet open={picking} onClose={() => setPicking(false)} title="Elegí una cara">
        <AvatarPicker value={draft.avatar} color={draft.color} onChange={(p) => onChange(p)} />
        <button className="btn btn-primary btn-lg mt-6" onClick={() => setPicking(false)}>
          Listo
        </button>
      </Sheet>
    </div>
  );
}
