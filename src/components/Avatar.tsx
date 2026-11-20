"use client";

import { createAvatar } from "@dicebear/core";
import { personas } from "@dicebear/collection";
import { Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import type { Member } from "@/lib/domain/types";

/*
 * Avatares ilustrados: estilo "Personas" de Draftbit (CC BY 4.0) vía DiceBear,
 * con opciones curadas para que siempre se vean amables y combinen con la paleta.
 * Se guardan como texto corto: "v2:pelo.colorPelo.piel.ropa.cara.barba".
 */

export const HAIR = [
  "shortCombover",
  "fade",
  "buzzcut",
  "curly",
  "curlyHighTop",
  "sideShave",
  "shortComboverChops",
  "mohawk",
  "balding",
  "bald",
  "bobCut",
  "bobBangs",
  "long",
  "extraLong",
  "curlyBun",
  "straightBun",
  "bunUndercut",
  "pigtails",
  "cap",
  "beanie",
] as const;
export const HAIR_COLORS = ["2b2420", "4a3226", "7a4b30", "a86b3c", "d9a55b", "e8cf8f", "b4483a", "9a9a9a", "e9e6df"];
export const SKIN = ["eeb4a4", "e7a391", "e5a07e", "d78774", "b16a5b", "92594b", "623d36"];
export const CLOTH = ["1e3a2b", "3f7a4f", "d9963a", "b4483a", "3d5a80", "7a5c8a", "c9c2ae", "2f2f2f"];
export const FACES = [
  { eyes: "open", mouth: "smile" },
  { eyes: "happy", mouth: "bigSmile" },
  { eyes: "open", mouth: "bigSmile" },
  { eyes: "wink", mouth: "smile" },
  { eyes: "glasses", mouth: "smile" },
  { eyes: "glasses", mouth: "bigSmile" },
  { eyes: "open", mouth: "smirk" },
  { eyes: "happy", mouth: "lips" },
  { eyes: "sunglasses", mouth: "smirk" },
] as const;
export const BEARDS = [null, "shadow", "goatee", "beardMustache", "pyramid", "walrus", "soulPatch"] as const;

/** Fondos suaves que combinan con la paleta. */
export const AVATAR_BGS = ["#f3dcc0", "#d9e6d5", "#dcdfee", "#f1d9d3", "#e8e1c8", "#d6e5e6", "#eadbe8", "#e4e4dc"];

export type AvatarConfig = { hair: number; hairColor: number; skin: number; cloth: number; face: number; beard: number };

/** Combinaciones de partida (también traducen los nombres de avatares viejos). */
const PRESETS: AvatarConfig[] = [
  { hair: 0, hairColor: 1, skin: 1, cloth: 0, face: 1, beard: 0 },
  { hair: 12, hairColor: 2, skin: 0, cloth: 3, face: 0, beard: 0 },
  { hair: 3, hairColor: 0, skin: 4, cloth: 2, face: 2, beard: 0 },
  { hair: 10, hairColor: 4, skin: 1, cloth: 4, face: 4, beard: 0 },
  { hair: 1, hairColor: 0, skin: 5, cloth: 1, face: 1, beard: 1 },
  { hair: 14, hairColor: 6, skin: 0, cloth: 5, face: 2, beard: 0 },
  { hair: 2, hairColor: 3, skin: 2, cloth: 6, face: 0, beard: 2 },
  { hair: 11, hairColor: 1, skin: 3, cloth: 0, face: 3, beard: 0 },
  { hair: 8, hairColor: 7, skin: 1, cloth: 4, face: 5, beard: 3 },
  { hair: 13, hairColor: 0, skin: 6, cloth: 2, face: 1, beard: 0 },
  { hair: 4, hairColor: 0, skin: 5, cloth: 3, face: 2, beard: 0 },
  { hair: 15, hairColor: 5, skin: 0, cloth: 1, face: 0, beard: 0 },
  { hair: 6, hairColor: 2, skin: 2, cloth: 7, face: 6, beard: 1 },
  { hair: 17, hairColor: 4, skin: 1, cloth: 5, face: 1, beard: 0 },
  { hair: 9, hairColor: 0, skin: 4, cloth: 0, face: 4, beard: 4 },
  { hair: 16, hairColor: 2, skin: 3, cloth: 2, face: 3, beard: 0 },
];
/** Nombres que usaba la versión anterior de los avatares. */
const LEGACY = ["Mateo", "Sofia", "Lucas", "Valentina", "Bruno", "Camila", "Tomas", "Julieta", "Santiago", "Martina", "Joaquin", "Abril", "Nicolas", "Emma", "Felipe", "Olivia"];

export function presetAvatar(i: number): string {
  return encodeAvatar(PRESETS[i % PRESETS.length]);
}

export function encodeAvatar(c: AvatarConfig): string {
  return `v2:${c.hair}.${c.hairColor}.${c.skin}.${c.cloth}.${c.face}.${c.beard}`;
}

const clamp = (n: number, len: number) => (Number.isInteger(n) && n >= 0 && n < len ? n : 0);

export function decodeAvatar(value: string | undefined | null): AvatarConfig | null {
  if (!value) return null;
  if (value.startsWith("v2:")) {
    const [hair, hairColor, skin, cloth, face, beard] = value.slice(3).split(".").map(Number);
    return {
      hair: clamp(hair, HAIR.length),
      hairColor: clamp(hairColor, HAIR_COLORS.length),
      skin: clamp(skin, SKIN.length),
      cloth: clamp(cloth, CLOTH.length),
      face: clamp(face, FACES.length),
      beard: clamp(beard, BEARDS.length),
    };
  }
  const legacy = LEGACY.indexOf(value);
  return legacy >= 0 ? PRESETS[legacy] : null;
}

export function randomAvatar(): AvatarConfig {
  const r = (n: number) => Math.floor(Math.random() * n);
  return { hair: r(HAIR.length), hairColor: r(HAIR_COLORS.length), skin: r(SKIN.length), cloth: r(CLOTH.length), face: r(FACES.length), beard: Math.random() < 0.25 ? 1 + r(BEARDS.length - 1) : 0 };
}

const cache = new Map<string, string>();
function svgUri(c: AvatarConfig) {
  const key = encodeAvatar(c);
  let uri = cache.get(key);
  if (!uri) {
    const face = FACES[c.face];
    const beard = BEARDS[c.beard];
    uri = createAvatar(personas, {
      seed: key,
      hair: [HAIR[c.hair]],
      hairColor: [HAIR_COLORS[c.hairColor]],
      skinColor: [SKIN[c.skin]],
      clothingColor: [CLOTH[c.cloth]],
      eyes: [face.eyes],
      mouth: [face.mouth],
      nose: ["smallRound"],
      body: ["rounded"],
      facialHair: beard ? [beard] : ["shadow"],
      facialHairProbability: beard ? 100 : 0,
    }).toDataUri();
    cache.set(key, uri);
  }
  return uri;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Avatar({
  member,
  size = 44,
  ring = false,
  dim = false,
  closeUp = false,
}: {
  member?: Pick<Member, "avatar" | "color" | "name"> | null;
  size?: number;
  ring?: boolean;
  dim?: boolean;
  /** Acerca la cara (para miniaturas de expresión y barba). */
  closeUp?: boolean;
}) {
  const value = member?.avatar;
  const uri = useMemo(() => {
    const c = decodeAvatar(value);
    return c ? svgUri(c) : null;
  }, [value]);
  const style = { width: size, height: size, background: member?.color ?? "var(--sunken)" };
  const cls = `relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden ${ring ? "ring-[3px] ring-white" : ""} ${dim ? "opacity-50 grayscale" : ""}`;
  if (!member)
    return (
      <span className={cls} style={style} aria-label="Sin responsable">
        <span className="text-ink-3 font-semibold" style={{ fontSize: size * 0.4 }}>
          ?
        </span>
      </span>
    );
  return (
    <span className={cls} style={style} aria-hidden>
      {uri ? (
        // eslint-disable-next-line @next/next/no-img-element -- SVG generado en el momento
        <img src={uri} alt="" width={size} height={size} className={`w-full h-full ${closeUp ? "translate-y-[22%] scale-[1.6]" : "translate-y-[4%] scale-[1.04]"}`} draggable={false} />
      ) : (
        <span className="display text-ink-2" style={{ fontSize: size * 0.4 }}>
          {initials(member.name)}
        </span>
      )}
    </span>
  );
}

/* ================= Editor de avatar ================= */

type Tab = "pelo" | "cara" | "ropa";

function Swatch({ hex, selected, onClick, label }: { hex: string; selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className={`tap h-10 w-10 rounded-full transition-shadow ${selected ? "ring-2 ring-pine ring-offset-2 ring-offset-paper" : "ring-1 ring-black/10"}`}
      style={{ background: hex.startsWith("#") ? hex : `#${hex}` }}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
    />
  );
}

function Choice({ selected, onClick, label, children }: { selected: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`tap rounded-2xl p-1.5 flex items-center justify-center transition-colors ${selected ? "bg-pine-soft ring-2 ring-pine" : "bg-surface ring-1 ring-line"}`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export function AvatarPicker({ value, color, name, onChange }: { value: string; color: string; name?: string; onChange: (p: { avatar?: string; color?: string }) => void }) {
  const cfg = decodeAvatar(value) ?? PRESETS[0];
  const [tab, setTab] = useState<Tab>("pelo");
  const set = (p: Partial<AvatarConfig>) => onChange({ avatar: encodeAvatar({ ...cfg, ...p }) });
  const thumb = (p: Partial<AvatarConfig>) => ({ avatar: encodeAvatar({ ...cfg, ...p }), color, name: name ?? "" });

  return (
    <div>
      <div className="flex flex-col items-center gap-3">
        <Avatar member={{ avatar: encodeAvatar(cfg), color, name: name ?? "" }} size={112} />
        <button type="button" className="btn btn-ghost !min-h-10 text-[0.9375rem]" onClick={() => onChange({ avatar: encodeAvatar(randomAvatar()) })}>
          <Shuffle size={17} /> Probar otra combinación
        </button>
      </div>

      <div className="segmented mt-4" role="tablist">
        {(
          [
            ["pelo", "Pelo"],
            ["cara", "Cara"],
            ["ropa", "Ropa y fondo"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 min-h-[22rem]">
        {tab === "pelo" && (
          <>
            <p className="label">Peinado</p>
            <div className="grid grid-cols-5 gap-2">
              {HAIR.map((h, i) => (
                <Choice key={h} selected={cfg.hair === i} onClick={() => set({ hair: i })} label={`Peinado ${i + 1}`}>
                  <Avatar member={thumb({ hair: i })} size={48} />
                </Choice>
              ))}
            </div>
            <p className="label mt-5">Color de pelo</p>
            <div className="flex flex-wrap gap-2.5">
              {HAIR_COLORS.map((h, i) => (
                <Swatch key={h} hex={h} selected={cfg.hairColor === i} onClick={() => set({ hairColor: i })} label={`Color de pelo ${i + 1}`} />
              ))}
            </div>
          </>
        )}
        {tab === "cara" && (
          <>
            <p className="label">Expresión</p>
            <div className="grid grid-cols-5 gap-2">
              {FACES.map((_, i) => (
                <Choice key={i} selected={cfg.face === i} onClick={() => set({ face: i })} label={`Expresión ${i + 1}`}>
                  <Avatar member={thumb({ face: i })} size={48} closeUp />
                </Choice>
              ))}
            </div>
            <p className="label mt-5">Barba</p>
            <div className="grid grid-cols-5 gap-2">
              {BEARDS.map((b, i) => (
                <Choice key={b ?? "none"} selected={cfg.beard === i} onClick={() => set({ beard: i })} label={b ? `Barba ${i}` : "Sin barba"}>
                  <Avatar member={thumb({ beard: i })} size={48} closeUp />
                </Choice>
              ))}
            </div>
            <p className="label mt-5">Tono de piel</p>
            <div className="flex flex-wrap gap-2.5">
              {SKIN.map((h, i) => (
                <Swatch key={h} hex={h} selected={cfg.skin === i} onClick={() => set({ skin: i })} label={`Tono de piel ${i + 1}`} />
              ))}
            </div>
          </>
        )}
        {tab === "ropa" && (
          <>
            <p className="label">Color de ropa</p>
            <div className="flex flex-wrap gap-2.5">
              {CLOTH.map((h, i) => (
                <Swatch key={h} hex={h} selected={cfg.cloth === i} onClick={() => set({ cloth: i })} label={`Color de ropa ${i + 1}`} />
              ))}
            </div>
            <p className="label mt-5">Fondo</p>
            <div className="flex flex-wrap gap-2.5">
              {AVATAR_BGS.map((c) => (
                <Swatch key={c} hex={c} selected={color === c} onClick={() => onChange({ color: c })} label="Elegir este fondo" />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
