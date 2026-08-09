import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline';
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-astra-500 focus:ring-offset-2",
                {
                    "border-transparent bg-astra-700 text-white shadow": variant === "default",
                    // Approved is harvest: padi green. Pending is still ripening:
                    // bulir gold. Rejected is Honda red, and red is spent nowhere else.
                    "border-padi-200 bg-padi-50 text-padi-800": variant === "success",
                    "border-bulir-200 bg-bulir-50 text-bulir-800": variant === "warning",
                    "border-honda-200 bg-honda-50 text-honda-700": variant === "destructive",
                    "border-slate-200 text-slate-700": variant === "outline",
                },
                className
            )}
            {...props}
        />
    )
}

export { Badge }
