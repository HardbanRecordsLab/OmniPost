"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated"
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.35)] overflow-hidden",
          variant === "elevated" &&
            "shadow-[0_20px_60px_rgba(15,23,42,0.45)] border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-900/20",
          "before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:via-transparent before:to-black/30 before:pointer-events-none",
          className
        )}
        {...props}
      />
    )
  }
)

GlassCard.displayName = "GlassCard"

