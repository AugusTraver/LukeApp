"use client";

import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";
import { useMemo } from "react";
import type { Member } from "@/lib/domain/types";

/** Caras para elegir (semillas de DiceBear Notionists, licencia CC0). */
export const AVATAR_SEEDS = ["Mateo", "Sofia", "Lucas", "Valentina", "Bruno", "Camila", "Tomas", "Julieta", "Santiago", "Martina", "Joaquin", "Abril", "Nicolas", "Emma", "Felipe", "Olivia"];

/** Fondos suaves que combinan con la paleta. */
export const AVATAR_BGS = ["#f3dcc0", "#d9e6d5", "#dcdfee", "#f1d9d3", "#e8e1c8", "#d6e5e6", "#eadbe8", "#e4e4dc"];

const cache = new Map<string, string>();
function svgUri(seed: string) {
  let uri = cache.get(seed);
  if (!uri) {
    uri = createAvatar(notionists, { seed, backgroundColor: ["transparent"] }).toDataUri();
    cache.set(seed, uri);
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
}: {
  member?: Pick<Member, "avatar" | "color" | "name"> | null;
  size?: number;
  ring?: boolean;
  dim?: boolean;
}) {
  const seed = member?.avatar;
  const uri = useMemo(() => (seed && AVATAR_SEEDS.includes(seed) ? svgUri(seed) : null), [seed]);
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
        <img src={uri} alt="" width={size} height={size} className="w-full h-full translate-y-[6%] scale-110" draggable={false} />
      ) : (
        <span className="font-semibold text-ink-2" style={{ fontSize: size * 0.38 }}>
          {initials(member.name)}
        </span>
      )}
    </span>
  );
}

export function AvatarPicker({ value, color, onChange }: { value: string; color: string; onChange: (p: { avatar?: string; color?: string }) => void }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {AVATAR_SEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`tap rounded-2xl p-1.5 transition-colors ${value === s ? "bg-pine" : "bg-transparent"}`}
            onClick={() => onChange({ avatar: s })}
            aria-pressed={value === s}
            aria-label={`Cara ${s}`}
          >
            <Avatar member={{ avatar: s, color, name: s }} size={56} />
          </button>
        ))}
      </div>
      <p className="label mt-4">Color de fondo</p>
      <div className="grid grid-cols-8 gap-1.5">
        {AVATAR_BGS.map((c) => (
          <button
            key={c}
            type="button"
            className={`tap aspect-square w-full rounded-full border-2 ${color === c ? "border-pine" : "border-transparent"}`}
            style={{ background: c }}
            onClick={() => onChange({ color: c })}
            aria-pressed={color === c}
            aria-label="Elegir este color"
          />
        ))}
      </div>
    </div>
  );
}
