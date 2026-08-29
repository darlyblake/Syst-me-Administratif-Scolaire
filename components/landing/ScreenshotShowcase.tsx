"use client"

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
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className={isEven ? "order-first" : "order-last"}>
            <Reveal>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
                <p className="mt-6 text-lg leading-8 text-slate-600">{description}</p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={isEven ? 120 : 0}>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
              {imagePath ? (
                <img
                  src={imagePath}
                  alt={title}
                  className="w-full rounded-2xl shadow-lg"
                />
              ) : (
                <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                  <div className="text-center">
                    <Monitor className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="text-sm text-slate-500">Capture d'écran à venir</p>
                    <p className="text-xs text-slate-400 mt-1">public/images/{title.toLowerCase().replace(/\s+/g, "-")}.png</p>
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
