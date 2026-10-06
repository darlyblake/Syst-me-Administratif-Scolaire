import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-[#172033] placeholder:text-[#8a93a3] selection:bg-[#dbe5ff] selection:text-[#172033] dark:bg-white dark:text-[#172033] dark:placeholder:text-[#8a93a3] border-[#cfd3dc] flex h-9 w-full min-w-0 rounded-md border bg-white px-3 py-1 text-sm text-[#172033] shadow-none transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-[#173b8f] focus-visible:ring-2 focus-visible:ring-[#173b8f]/15",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
