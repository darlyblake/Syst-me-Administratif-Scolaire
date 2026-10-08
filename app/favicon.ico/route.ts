import { NextResponse } from "next/server"

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#102b55"/>
  <path d="M12 20 32 12l20 8-20 8-20-8Z" fill="#fff"/>
  <path d="M18 25v15c8 6 20 8 28 0V25l-14 6-14-6Z" fill="#fff"/>
  <path d="M52 21v18" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
</svg>`

export function GET() {
  return new NextResponse(SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
