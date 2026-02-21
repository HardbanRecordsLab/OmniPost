"use client"

import { ButtonHTMLAttributes, ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "outline" | "gradient"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  icon?: ReactNode
}

export function AnimatedButton({
  children,
  className,
  variant = "solid",
  size = "md",
  loading,
  icon,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const isDisabled = disabled || loading

  return (
    <motion.button
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500 disabled:opacity-60 disabled:cursor-not-allowed",
        size === "sm" && "h-8 px-4 text-xs",
        size === "md" && "h-10 px-5 text-sm",
        size === "lg" && "h-11 px-6 text-base",
        variant === "solid" &&
          "bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-500/30",
        variant === "outline" &&
          "border border-purple-500/60 text-purple-500 hover:bg-purple-500/10",
        variant === "gradient" &&
          "bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 text-white shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60",
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
      )}
      {icon && <span className="mr-2 flex items-center">{icon}</span>}
      <span>{children}</span>
    </motion.button>
  )
}

