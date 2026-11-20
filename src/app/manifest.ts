import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LukeApp · Turnos de paseo",
    short_name: "LukeApp",
    description: "¿A quién le toca sacar al perro hoy?",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff7ec",
    theme_color: "#fff7ec",
    lang: "es-AR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
