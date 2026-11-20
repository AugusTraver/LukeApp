// Ilustración del perro: border collie sentado, de frente. Vector propio, sin dependencias.
export type DogMood = "happy" | "waiting" | "sad" | "sleep";
export type DogCoat = "black" | "brown" | "golden" | "gray";

export const COATS: { id: DogCoat; label: string; fur: string; furShade: string; ear: string }[] = [
  { id: "black", label: "Negro y blanco", fur: "#22201e", furShade: "#151413", ear: "#4a4340" },
  { id: "brown", label: "Marrón y blanco", fur: "#5b3a27", furShade: "#43291b", ear: "#8a6450" },
  { id: "golden", label: "Dorado", fur: "#c07a33", furShade: "#9e5f22", ear: "#e0a368" },
  { id: "gray", label: "Gris", fur: "#6b7378", furShade: "#525a5f", ear: "#9aa1a5" },
];

const WHITE = "#fbfaf6";
const WHITE_SHADE = "#e7e3d8";
const NOSE = "#1a1716";

function mirror(d: string) {
  // Refleja un path horizontalmente sobre x = 120 (solo comandos absolutos con pares x,y).
  return d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${240 - Number(x)} ${y}`);
}

const EAR = "M79 80 C 70 66, 67 50, 72 36 C 75 30, 82 29, 87 33 C 97 42, 105 52, 110 63 Z";
const EAR_INNER = "M83 71 C 78 61, 77 51, 79 43 C 87 48, 94 56, 100 64 Z";
const EAR_FOLD = "M72 36 C 78 31, 88 33, 94 41 C 87 42, 79 44, 71 49 C 70 44, 70 40, 72 36 Z";
const HEAD = "M120 50 C 147 50, 165 67, 166 91 C 167 111, 157 127, 142 135 C 134 139, 127 141, 120 141 C 113 141, 106 139, 98 135 C 83 127, 73 111, 74 91 C 75 67, 93 50, 120 50 Z";

export function Dog({
  mood = "happy",
  coat = "black",
  size = 200,
  sun = true,
  className = "",
  label,
}: {
  mood?: DogMood;
  coat?: DogCoat;
  size?: number;
  sun?: boolean;
  className?: string;
  label?: string;
}) {
  const c = COATS.find((x) => x.id === coat) ?? COATS[0];
  const sad = mood === "sad";
  const closed = mood === "happy" || mood === "sleep";
  const earTilt = sad ? 34 : 0;

  return (
    <svg
      viewBox="0 0 240 230"
      width={size}
      height={(size * 230) / 240}
      className={className}
      role="img"
      aria-label={label ?? { happy: "El perro, contento", waiting: "El perro, esperando su paseo", sad: "El perro, triste", sleep: "El perro, durmiendo" }[mood]}
    >
      {sun && <circle cx="172" cy="66" r="34" fill="#e9b562" opacity={sad ? 0.35 : 0.9} />}

      {/* pasto */}
      <g fill="#7fa37f" opacity="0.8">
        <path d="M36 210 C 34 198, 38 188, 46 182 C 44 192, 44 200, 46 210 Z" />
        <path d="M46 210 C 48 200, 54 194, 62 192 C 56 198, 52 204, 52 210 Z" />
        <path d="M204 210 C 206 199, 202 190, 194 186 C 197 195, 197 202, 196 210 Z" />
      </g>
      <ellipse cx="120" cy="212" rx="84" ry="7" fill="rgba(30,58,43,0.13)" />

      {/* cola */}
      {mood !== "sleep" && (
        <g className={`dog-tail ${mood === "happy" ? "fast" : mood === "waiting" ? "slow" : ""}`}>
          <path
            d={sad ? "M166 196 C 186 200, 202 202, 214 198 C 218 196, 218 192, 213 191 C 200 194, 184 192, 168 188 Z" : "M166 192 C 192 190, 210 172, 210 148 C 210 139, 202 137, 199 145 C 197 162, 188 175, 164 180 Z"}
            fill={c.fur}
          />
          {!sad && <path d="M210 148 C 210 139, 202 137, 199 145 C 200 152, 207 154, 210 148 Z" fill={WHITE} />}
          {sad && <path d="M214 198 C 218 196, 218 192, 213 191 C 210 193, 210 197, 214 198 Z" fill={WHITE} />}
        </g>
      )}

      <g className="dog-breathe">
        {/* cuerpo y patas traseras */}
        <ellipse cx="80" cy="192" rx="28" ry="22" fill={c.fur} />
        <ellipse cx="160" cy="192" rx="28" ry="22" fill={c.fur} />
        <path d="M76 204 C 68 170, 78 140, 100 128 L 140 128 C 162 140, 172 170, 164 204 Z" fill={c.fur} />
        <ellipse cx="66" cy="208" rx="15" ry="6.5" fill={c.furShade} />
        <ellipse cx="174" cy="208" rx="15" ry="6.5" fill={c.furShade} />
        <ellipse cx="60" cy="208.5" rx="7" ry="4.5" fill={WHITE} />
        <ellipse cx="180" cy="208.5" rx="7" ry="4.5" fill={WHITE} />

        {/* pechera blanca con pelo */}
        <path
          d="M96 132 C 101 146, 99 160, 103 172 C 99 178, 104 184, 102 192 C 106 196, 112 200, 120 200 C 128 200, 134 196, 138 192 C 136 184, 141 178, 137 172 C 141 160, 139 146, 144 132 C 132 142, 108 142, 96 132 Z"
          fill={WHITE}
        />
        <path d="M108 146 C 111 150, 113 151, 116 150 M124 150 C 127 151, 129 150, 132 146" stroke={WHITE_SHADE} strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* patas delanteras */}
        <path d="M103 166 C 102 182, 101 196, 100 204 C 100 210, 104 212, 110 212 C 116 212, 119 209, 118 203 C 117 192, 117 180, 117 166 Z" fill={WHITE} stroke={WHITE_SHADE} strokeWidth="1.4" />
        <path d="M137 166 C 138 182, 139 196, 140 204 C 140 210, 136 212, 130 212 C 124 212, 121 209, 122 203 C 123 192, 123 180, 123 166 Z" fill={WHITE} stroke={WHITE_SHADE} strokeWidth="1.4" />
        <path d="M106 208 v 3 M112 208 v 3 M128 208 v 3 M134 208 v 3" stroke={WHITE_SHADE} strokeWidth="1.4" strokeLinecap="round" />

        {/* collar */}
        <path d="M97 129 C 110 137, 130 137, 143 129" stroke="#1e3a2b" strokeWidth="7" fill="none" strokeLinecap="round" />
        <circle cx="120" cy="140" r="5.5" fill="#d9963a" stroke="#b07526" strokeWidth="1.2" />

        {/* orejas */}
        <g transform={`rotate(${-earTilt} 96 66)`}>
          <path d={EAR} fill={c.fur} />
          <path d={EAR_INNER} fill={c.ear} />
          {!sad && <path d={EAR_FOLD} fill={c.furShade} />}
        </g>
        <g transform={`rotate(${earTilt} 144 66)`}>
          <path d={mirror(EAR)} fill={c.fur} />
          <path d={mirror(EAR_INNER)} fill={c.ear} />
          {!sad && <path d={mirror(EAR_FOLD)} fill={c.furShade} />}
        </g>

        {/* cabeza */}
        <path d={HEAD} fill={c.fur} />
        {/* franja y hocico blancos */}
        <path d="M120 56 C 116 68, 112 80, 107 94 L 133 94 C 128 80, 124 68, 120 56 Z" fill={WHITE} />
        <path d="M95 106 C 95 93, 107 88, 120 88 C 133 88, 145 93, 145 106 C 145 123, 134 136, 120 136 C 106 136, 95 123, 95 106 Z" fill={WHITE} />
        <path d="M102 124 C 108 132, 114 135, 120 135 C 126 135, 132 132, 138 124" stroke={WHITE_SHADE} strokeWidth="1.8" fill="none" />

        {/* ojos */}
        {closed ? (
          <g stroke={WHITE} strokeWidth="3.2" fill="none" strokeLinecap="round">
            {mood === "happy" ? (
              <>
                <path d="M93 86 Q 100 79 107 86" />
                <path d="M133 86 Q 140 79 147 86" />
              </>
            ) : (
              <>
                <path d="M93 85 Q 100 90 107 85" />
                <path d="M133 85 Q 140 90 147 85" />
              </>
            )}
          </g>
        ) : (
          <>
            <circle cx="100" cy={sad ? 87 : 84} r="7.2" fill="#2b1b12" />
            <circle cx="140" cy={sad ? 87 : 84} r="7.2" fill="#2b1b12" />
            <circle cx="102.3" cy={sad ? 85 : 81.5} r="2.3" fill="#fff" />
            <circle cx="142.3" cy={sad ? 85 : 81.5} r="2.3" fill="#fff" />
            {sad && (
              <>
                {/* párpados caídos */}
                <path d="M91 82 L 109 86 L 109 79 L 91 79 Z" fill={c.fur} />
                <path d="M149 82 L 131 86 L 131 79 L 149 79 Z" fill={c.fur} />
              </>
            )}
          </>
        )}

        {/* nariz y boca */}
        <path d="M111 104 C 111 99.5, 129 99.5, 129 104 C 129 110, 123 113.5, 120 113.5 C 117 113.5, 111 110, 111 104 Z" fill={NOSE} />
        <ellipse cx="116" cy="103" rx="3" ry="1.6" fill="#5b5450" />
        <path d="M120 113 L 120 118" stroke={NOSE} strokeWidth="2.2" strokeLinecap="round" />
        {mood === "happy" ? (
          <>
            <path d="M105 117 C 110 124, 116 124, 120 118 C 124 124, 130 124, 135 117" stroke={NOSE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M112.5 121 C 112.5 135, 127.5 135, 127.5 121 C 123 124, 117 124, 112.5 121 Z" fill="#e57f86" />
            <path d="M120 123 L 120 130" stroke="#c9626a" strokeWidth="1.4" strokeLinecap="round" />
          </>
        ) : sad ? (
          <path d="M108 124 C 112 119, 116 118, 120 118 C 124 118, 128 119, 132 124" stroke={NOSE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M108 119 C 112 123, 116 123, 120 118 C 124 123, 128 123, 132 119" stroke={NOSE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        )}
      </g>

      {/* correa en el piso cuando espera */}
      {mood === "waiting" && (
        <g>
          <path d="M44 214 C 30 214, 22 206, 28 198 C 34 190, 48 194, 52 202" stroke="#d9963a" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="53" cy="204" r="3.5" fill="none" stroke="#9a9a92" strokeWidth="2" />
        </g>
      )}
      {mood === "sleep" && (
        <g fill="#7b867e" fontFamily="var(--font-newsreader), serif" fontStyle="italic">
          <text x="170" y="40" fontSize="20">z</text>
          <text x="184" y="26" fontSize="14">z</text>
        </g>
      )}
    </svg>
  );
}
