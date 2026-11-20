import type { FamilyData } from "./types";

/** La familia original: reproduce exactamente la regla de la LukeApp anterior. */
export function augusFamily(startDate = "2026-11-16"): FamilyData {
  return {
    family: {
      id: "fam-augus",
      name: "Familia de Augus",
      dogName: "Luke",
      dogEmoji: "🐕",
      timeZone: "America/Argentina/Buenos_Aires",
      walkTimes: ["17:20"],
      // Lunes Augus, martes Lucio, el resto rota.
      fixedDays: ["augus", "lucio", null, null, null, null, null],
      // Con este ancla, el miércoles 18/11/2026 le toca a Lucio (como en la app anterior).
      rotation: ["lucio", "augus"],
      rotationAnchor: "2026-11-16",
      startDate,
      settings: { penalty: true, insistent: true },
      joinCode: "LUKE-4821",
    },
    members: [
      { id: "augus", name: "Augus", avatar: "🧑🏻", color: "#FDBA74", role: "admin", walks: true },
      { id: "lucio", name: "Lucio", avatar: "👦🏻", color: "#93C5FD", role: "walker", walks: true },
      { id: "silhect", name: "SilHect", avatar: "👨🏻", color: "#C4B5FD", role: "observer", walks: false },
    ],
    overrides: [],
    swaps: [],
    confirmations: [],
  };
}
