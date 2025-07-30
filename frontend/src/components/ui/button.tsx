import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground rounded-lg hover:bg-primary-glow shadow-soft hover:shadow-primary",
        destructive: "bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 shadow-soft",
        success: "bg-success text-success-foreground rounded-lg hover:bg-success/90 shadow-soft",
        warning: "bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 shadow-soft",
        outline: "border border-input bg-background rounded-lg hover:bg-accent hover:text-accent-foreground shadow-soft",
        secondary: "bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 shadow-soft",
        ghost: "rounded-lg hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Butchery-specific variants
        hero: "bg-gradient-primary text-primary-foreground rounded-2xl hover:shadow-primary transform hover:scale-105 font-semibold",
        butcher: "bg-primary text-primary-foreground rounded-xl border-2 border-primary-glow/20 hover:border-primary-glow/40 shadow-medium hover:shadow-primary",
        action: "bg-background text-foreground border-2 border-primary rounded-xl hover:bg-primary hover:text-primary-foreground shadow-soft hover:shadow-primary",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
