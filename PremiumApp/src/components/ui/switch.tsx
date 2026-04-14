"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
    return (
        <SwitchPrimitive.Root
            data-slot="switch"
            className={cn(
                "group relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-white/10 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-amber-500 data-[unchecked]:bg-zinc-800 data-[checked]:border-amber-400/50 shadow-inner",
                className
            )}
            {...props}
        >
            <SwitchPrimitive.Thumb
                data-slot="switch-thumb"
                className={cn(
                    "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-300 data-[checked]:translate-x-5 data-[unchecked]:translate-x-0 group-hover:scale-110",
                    "data-[checked]:bg-white data-[unchecked]:bg-white/70"
                )}
            />
        </SwitchPrimitive.Root>
    )
}

export { Switch }
