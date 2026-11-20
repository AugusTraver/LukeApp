// Luke: border collie blanco y negro, sentado de frente.
export type LukeMood = "happy" | "waiting" | "sad" | "sleep";

export function Luke({ mood = "happy", size = 180, className = "" }: { mood?: LukeMood; size?: number; className?: string }) {
  const ink = "#2b211b";
  const white = "#fffaf3";
  const earDrop = mood === "sad" ? 10 : 0;
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`${mood !== "sleep" ? "luke-bob" : ""} ${className}`}
      role="img"
      aria-label={
        { happy: "Luke contento", waiting: "Luke esperando su paseo", sad: "Luke triste", sleep: "Luke durmiendo" }[mood]
      }
    >
      {/* sombra */}
      <ellipse cx="100" cy="186" rx="62" ry="8" fill="rgba(58,38,24,0.12)" />

      {/* cola */}
      <g className={mood === "happy" ? "luke-tail" : mood === "waiting" ? "luke-tail-slow" : ""}>
        <path d="M146 160 C 170 150, 178 128, 172 112 C 168 124, 160 140, 142 150 Z" fill={ink} />
        <path d="M172 112 C 176 118, 175 124, 171 128 C 168 122, 168 116, 172 112 Z" fill={white} />
      </g>

      {/* cuerpo */}
      <path d="M58 182 C 52 150, 62 118, 100 112 C 138 118, 148 150, 142 182 Z" fill={ink} />
      {/* pecho blanco */}
      <path d="M80 182 C 78 150, 86 126, 100 122 C 114 126, 122 150, 120 182 Z" fill={white} />
      {/* patas */}
      <rect x="76" y="164" width="18" height="22" rx="9" fill={white} />
      <rect x="106" y="164" width="18" height="22" rx="9" fill={white} />
      <path d="M80 182 h10 M110 182 h10" stroke="#e6d6c6" strokeWidth="2" strokeLinecap="round" />

      {/* collar */}
      <path d="M72 120 C 90 130, 110 130, 128 120" stroke="#f2711c" strokeWidth="7" fill="none" strokeLinecap="round" />
      <circle cx="100" cy="131" r="5" fill="#ffcf4a" stroke="#d4a017" strokeWidth="1.5" />

      {/* correa cuando espera */}
      {mood === "waiting" && (
        <path d="M100 136 C 120 150, 150 140, 170 170 C 176 178, 182 184, 190 186" stroke="#f2711c" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}

      {/* orejas */}
      <g transform={`translate(0 ${earDrop})`}>
        <path d={mood === "sad" ? "M58 56 C 40 70, 40 96, 54 104 C 62 92, 66 76, 70 62 Z" : "M60 58 C 46 40, 44 22, 52 14 C 66 22, 74 40, 76 54 Z"} fill={ink} />
        <path d={mood === "sad" ? "M142 56 C 160 70, 160 96, 146 104 C 138 92, 134 76, 130 62 Z" : "M140 58 C 154 40, 156 22, 148 14 C 134 22, 126 40, 124 54 Z"} fill={ink} />
        {mood !== "sad" && (
          <>
            <path d="M58 50 C 52 38, 52 28, 55 22 C 62 30, 66 40, 68 50 Z" fill="#f6b8a8" />
            <path d="M142 50 C 148 38, 148 28, 145 22 C 138 30, 134 40, 132 50 Z" fill="#f6b8a8" />
          </>
        )}
      </g>

      {/* cabeza */}
      <ellipse cx="100" cy="78" rx="46" ry="42" fill={ink} />
      {/* franja blanca y hocico */}
      <path d="M100 38 C 94 50, 92 62, 90 76 L 110 76 C 108 62, 106 50, 100 38 Z" fill={white} />
      <ellipse cx="100" cy="98" rx="26" ry="20" fill={white} />

      {/* ojos */}
      {mood === "happy" && (
        <>
          <path d="M72 76 Q 79 68 86 76" stroke={white} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M114 76 Q 121 68 128 76" stroke={white} strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      )}
      {mood === "waiting" && (
        <>
          <circle cx="79" cy="74" r="7" fill={white} />
          <circle cx="121" cy="74" r="7" fill={white} />
          <circle cx="80" cy="73" r="4" fill={ink} />
          <circle cx="122" cy="73" r="4" fill={ink} />
          <circle cx="81.5" cy="71.5" r="1.4" fill={white} />
          <circle cx="123.5" cy="71.5" r="1.4" fill={white} />
        </>
      )}
      {mood === "sad" && (
        <>
          <circle cx="79" cy="77" r="6.5" fill={white} />
          <circle cx="121" cy="77" r="6.5" fill={white} />
          <circle cx="79" cy="78" r="3.6" fill={ink} />
          <circle cx="121" cy="78" r="3.6" fill={ink} />
          <path d="M70 68 L 86 72 M130 68 L 114 72" stroke={white} strokeWidth="3" strokeLinecap="round" />
          <path d="M84 86 C 82 92, 86 94, 87 90 C 88 88, 86 86, 84 86 Z" fill="#7cc3f0" />
        </>
      )}
      {mood === "sleep" && (
        <>
          <path d="M72 76 Q 79 82 86 76" stroke={white} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M114 76 Q 121 82 128 76" stroke={white} strokeWidth="4" fill="none" strokeLinecap="round" />
          <text x="146" y="40" fontSize="18" fontWeight="900" fill="#7a6151">z</text>
          <text x="160" y="26" fontSize="13" fontWeight="900" fill="#7a6151">z</text>
        </>
      )}

      {/* nariz */}
      <ellipse cx="100" cy="90" rx="8" ry="6" fill={ink} />
      <ellipse cx="98" cy="88" rx="2.5" ry="1.5" fill="#6b5a50" />

      {/* boca */}
      {mood === "happy" && (
        <>
          <path d="M88 100 Q 100 112 112 100" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M94 104 C 94 118, 106 118, 106 104 Z" fill="#f2777a" />
          <path d="M100 106 L 100 113" stroke="#d65a5e" strokeWidth="1.5" />
        </>
      )}
      {mood === "waiting" && <path d="M90 102 Q 100 108 110 102" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />}
      {mood === "sad" && <path d="M90 108 Q 100 100 110 108" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />}
      {mood === "sleep" && <path d="M94 103 Q 100 106 106 103" stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />}

      {/* cachetes */}
      {mood === "happy" && (
        <>
          <ellipse cx="74" cy="94" rx="6" ry="4" fill="#f6b8a8" opacity="0.7" />
          <ellipse cx="126" cy="94" rx="6" ry="4" fill="#f6b8a8" opacity="0.7" />
        </>
      )}
    </svg>
  );
}
