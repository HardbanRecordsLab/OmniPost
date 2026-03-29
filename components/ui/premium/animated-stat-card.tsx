"use client"

import { ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedStatCardProps {
  title: string
  value: string
  change?: string
  trend?: "up" | "down" | "neutral"
  icon?: ReactNode
  className?: string
}

export function AnimatedStatCard({
  title,
  value,
  change,
  trend = "neutral",
  icon,
  className
}: AnimatedStatCardProps) {
  const trendColor =
    trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-slate-400"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/30 to-slate-900/10 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.65)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">{value}</p>
          {change && (
            <p className={cn("mt-1 text-xs font-medium", trendColor)}>
              {trend === "up" && "↑ "}
              {trend === "down" && "↓ "}
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/60 text-slate-200">
            {icon}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-purple-500/10 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-16 bg-gradient-to-tr from-purple-500/40 via-violet-400/30 to-transparent opacity-40 blur-2xl" />
    </motion.div>
  )
}

