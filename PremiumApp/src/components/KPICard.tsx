'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon | React.ReactNode
  color?: 'amber' | 'green' | 'red' | 'blue' | 'purple' | 'emerald'
  trend?: {
    value: number
    isPositive: boolean
  } | string
  status?: 'success' | 'warning'
  className?: string
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
  trend,
  status,
  className
}: KPICardProps) {
  const variants = {
    amber: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30",
    green: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30",
    emerald: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30",
    red: "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30",
    blue: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30",
    purple: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/20 dark:border-purple-500/30",
  }

  const colorStyles = variants[color] || variants.blue

  // Handle both LucideIcon component (function or forwardRef object) and passed-in React node
  const renderIcon = () => {
    if (!icon) return null
    
    // 1. If it's already a React element (e.g., <CalendarIcon />)
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<any>, {
        className: cn("w-4 h-4", (icon.props as any)?.className)
      })
    }
    
    // 2. If it's a component type (e.g., CalendarIcon)
    const isComponent = typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in (icon as any))
    
    if (isComponent) {
      const IconComp = icon as any
      return <IconComp className="w-4 h-4" />
    }
    
    return icon as React.ReactNode
  }

  return (
    <Card className={cn(
      "glass-card border-border/10 rounded-2xl overflow-hidden group hover:bg-foreground/[0.02] transition-all duration-500",
      className
    )}>
      <CardContent className="p-4 md:p-5">
        <div className="flex justify-between items-start mb-3">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]",
            colorStyles
          )}>
            {renderIcon()}
          </div>
          
          {trend && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black tracking-tight",
              typeof trend === 'string' 
                ? "bg-emerald-500/10 text-emerald-500"
                : trend.isPositive 
                  ? "bg-emerald-500/10 text-emerald-500" 
                  : "bg-rose-500/10 text-rose-500"
            )}>
              {typeof trend === 'object' && (
                trend.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />
              )}
              {typeof trend === 'string' ? trend : `${trend.value}%`}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] leading-tight">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black font-display text-foreground tracking-tight">
              {value}
            </h3>
            {status === 'warning' && (
              <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
            )}
          </div>
          {subtitle && (
            <p className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider truncate">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}