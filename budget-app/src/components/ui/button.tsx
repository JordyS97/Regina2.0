import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    // Only transform and background transition — never `all`, which
                    // would animate layout properties nobody asked to move. The
                    // press scale is what makes the button feel like it heard you.
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium",
                    "transition-[transform,background-color,border-color,color] duration-150 ease-out-strong",
                    "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-astra-500 focus-visible:ring-offset-1",
                    "disabled:pointer-events-none disabled:opacity-50",
                    {
                        "bg-astra-600 text-white shadow hover:bg-astra-700": variant === "default",
                        "bg-honda-600 text-white shadow-sm hover:bg-honda-700": variant === "destructive",
                        "border border-slate-200 bg-white shadow-sm hover:bg-slate-100 text-slate-900": variant === "outline",
                        "bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200": variant === "secondary",
                        "hover:bg-slate-100 hover:text-slate-900 text-slate-700": variant === "ghost",
                        "text-slate-900 underline-offset-4 hover:underline": variant === "link",
                        "h-9 px-4 py-2": size === "default",
                        "h-8 rounded-md px-3 text-xs": size === "sm",
                        "h-10 rounded-md px-8": size === "lg",
                        "h-9 w-9": size === "icon",
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
