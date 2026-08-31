import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NOVA — Système de Gestion Scolaire",
    short_name: "NOVA",
    description: "Système professionnel de gestion scolaire",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#102b55",
    categories: ["education", "productivity"],
    lang: "fr",
    prefer_related_applications: false,
    icons: [
      {
        src: "/nova-icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/nova-icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  }
}
