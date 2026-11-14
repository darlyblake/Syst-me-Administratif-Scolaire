"use client"

import Image from "next/image"
import { Monitor } from "lucide-react"
import { Reveal } from "./Reveal"

interface ScreenshotShowcaseProps {
  title: string
  description: string
  imagePath?: string
  index?: number
}

export function ScreenshotShowcase({ title, description, imagePath, index = 0 }: ScreenshotShowcaseProps) {
  const isEven = index % 2 === 0

  return (
    <section id={index === 0 ? "captures" : undefined} className="border-t border-blue-100 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className={isEven ? "order-first" : "order-last"}>
            <Reveal>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-800">Aperçu de la plateforme</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
                <p className="mt-6 text-lg leading-8 text-slate-600">{description}</p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={isEven ? 120 : 0}>
            <div className="landing-screenshot-frame rounded-2xl border border-blue-100 bg-slate-50 p-3 sm:rounded-3xl sm:p-5">
              {imagePath ? (
                <Image
                  src={imagePath}
                  alt={`Capture réelle de l’application — ${title}`}
                  width={1600}
                  height={1000}
                  loading="lazy"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="h-auto w-full rounded-xl border border-slate-200 bg-white shadow-md"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-100">
                  <div className="text-center">
                    <Monitor className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                    <p className="text-sm text-slate-500">Aperçu bientôt disponible</p>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
