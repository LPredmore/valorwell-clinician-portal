
import * as React from "react"
import { Button } from "@/components/ui/button"

interface CustomDialogCloseProps {
  children: React.ReactNode
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function CustomDialogClose({ children, variant = "default" }: CustomDialogCloseProps) {
  return (
    <Button variant={variant} onClick={() => document.querySelector('[data-state="open"]')?.dispatchEvent(new Event('close', { bubbles: true }))}>
      {children}
    </Button>
  )
}
