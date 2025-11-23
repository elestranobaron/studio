"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "@/lib/utils"

// ──────────────────────────────────────────────────────────────
// Chart config (version 2025 compatible)
// ──────────────────────────────────────────────────────────────
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType<any>
    color?: string
    theme?: { light: string; dark: string }
  }
>

// ──────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────
type ChartContextValue = { config: ChartConfig }
const ChartContext = React.createContext<ChartContextValue | null>(null)
const useChart = () => {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error("useChart must be used within a <ChartContainer />")
  return context
}

// ──────────────────────────────────────────────────────────────
// Container
// ──────────────────────────────────────────────────────────────
type ChartContainerProps = React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ReactNode
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId()
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          ref={ref}
          data-chart={chartId}
          className={cn(
            "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line]:stroke-border [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
            className
          )}
          {...props}
        >
          <ChartStyle id={chartId} config={config} />
          <RechartsPrimitive.ResponsiveContainer>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

// ──────────────────────────────────────────────────────────────
// Style injection
// ──────────────────────────────────────────────────────────────
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, item]) => item.color || item.theme)

  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart=${id}] {
${colorConfig
  .map(([key, item]) => {
    const lightColor = item.color || item.theme?.light
    const darkColor = item.theme?.dark || item.color
    return lightColor ? `  --color-${key}: ${lightColor};` : ""
  })
  .filter(Boolean)
  .join("\n")}
}
.dark [data-chart=${id}] {
${colorConfig
  .map(([key, item]) => {
    const darkColor = item.theme?.dark || item.color
    return darkColor ? `  --color-${key}: ${darkColor};` : ""
  })
  .filter(Boolean)
  .join("\n")}
}
`.trim(),
      }}
    />
  )
}

// ──────────────────────────────────────────────────────────────
// Tooltip
// ──────────────────────────────────────────────────────────────
const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "dot" | "line" | "dashed"
    nameKey?: string
  }
>(({ className, hideLabel = false, hideIndicator = false, indicator = "dot", nameKey, ...props }, ref) => {
  const { config } = useChart()
  const { active, payload, label } = props as any

  if (!active || !payload?.length) return null

  return (
    <div
      ref={ref}
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {!hideLabel && (
        <div className="font-medium">
          {typeof label === "string" ? config[label]?.label || label : label}
        </div>
      )}
      <div className="grid gap-1.5">
        {payload.map((entry: any, index: number) => {
          const key = nameKey || entry.name || entry.dataKey || "value"
          const itemConfig = config[key] || {}
          const color = entry.color || entry.payload?.fill

          return (
            <div key={index} className={cn("flex items-center gap-2", indicator === "dot" && "items-center")}>
              {!hideIndicator && (
                <div
                  className={cn(
                    "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                    indicator === "dot" && "h-2.5 w-2.5",
                    indicator === "line" && "w-4 h-1",
                    indicator === "dashed" && "w-4 h-1 border-dashed bg-transparent"
                  )}
                  style={{ "--color-bg": color, "--color-border": color } as React.CSSProperties}
                />
              )}
              <div className="flex flex-1 justify-between">
                <span className="text-muted-foreground">{itemConfig.label || entry.name}</span>
                {entry.value != null && (
                  <span className="font-mono font-medium tabular-nums">{entry.value.toLocaleString()}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

// ──────────────────────────────────────────────────────────────
// Legend
// ──────────────────────────────────────────────────────────────
const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { hideIcon?: boolean; nameKey?: string }
>(({ className, hideIcon = false, nameKey, ...props }, ref) => {
  const { config } = useChart()
  const { payload } = props as any

  if (!payload?.length) return null

  return (
    <div ref={ref} className={cn("flex items-center justify-center gap-4 py-3", className)}>
      {payload.map((entry: any) => {
        const key = nameKey || entry.dataKey || "value"
        const itemConfig = config[key] || {}

        return (
          <div key={entry.value} className="flex items-center gap-1.5">
            {itemConfig.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: entry.color }} />
            )}
            <span className="text-xs">{itemConfig.label || entry.value}</span>
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = "ChartLegendContent"

// ──────────────────────────────────────────────────────────────
// Export
// ──────────────────────────────────────────────────────────────
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}