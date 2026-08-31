import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NOVA — Système de Gestion Scolaire",
    short_name: "NOVA",
    description: "Système professionnel de gestion scolaire",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#102b55",
    categories: ["education", "productivity"],
    lang: "fr",
    icons: [
      {
        src: "/nova-logo.webp",
        sizes: "512x512",
        type: "image/webp",
        purpose: "any",
      },
      {
        src: "/nova-logo.webp",
        sizes: "512x512",
        type: "image/webp",
        purpose: "maskable",
      },
    ],
  }
}
