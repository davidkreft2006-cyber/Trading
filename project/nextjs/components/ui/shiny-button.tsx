"use client"

import type React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import "./shiny-button.css"

interface ShinyButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  /** Auvryn-Erweiterung: mit href wird ein Next-Link gerendert */
  href?: string
  type?: "button" | "submit" | "reset"
  disabled?: boolean
}

/**
 * Signatur-CTA mit umlaufendem Glanz. Sparsam einsetzen (eine Stelle pro Ansicht),
 * sonst verliert der Effekt seine Wirkung. Styles: ./shiny-button.css
 */
export function ShinyButton({ children, onClick, className = "", href, type = "button", disabled }: ShinyButtonProps) {
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cn("shiny-cta", className)}>
        <span>{children}</span>
      </Link>
    )
  }
  return (
    <button type={type} disabled={disabled} className={cn("shiny-cta", className)} onClick={onClick}>
      <span>{children}</span>
    </button>
  )
}
