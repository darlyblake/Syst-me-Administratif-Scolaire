import type React from "react"

export default function ParentsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">{children}</div>
}
