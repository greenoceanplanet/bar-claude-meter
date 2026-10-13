export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

/** Local clock reading as "HH:MM", or undefined. Injected so tests do not depend on the timezone. */
export type Clock = (date: Date) => string

export const THRESHOLDS = [80, 90] as const

export const localClock: Clock = (date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

const ORDER = ['five_hour', 'seven_day']

export function labelFor(kind: string): string {
  if (kind === 'five_hour') return '5h'
  if (kind === 'seven_day') return 'week'
  if (kind === 'spend_limit') return 'spend'
  return kind
}

export function sortLimits(limits: RateLimit[]): RateLimit[] {
  const rank = (kind: string) => {
    const i = ORDER.indexOf(kind)
    return i === -1 ? ORDER.length : i
  }
  return limits
    .map((limit, index) => ({ limit, index }))
    .sort((a, b) => rank(a.limit.kind) - rank(b.limit.kind) || a.index - b.index)
    .map((x) => x.limit)
}

export function resetTime(resetsAt: string | undefined, clock: Clock): string | undefined {
  if (!resetsAt) return undefined
  const date = new Date(resetsAt)
  if (Number.isNaN(date.getTime())) return undefined
  return clock(date)
}

const WINDOW_MS: Record<string, number> = {
  five_hour: 5 * 3600_000,
  seven_day: 7 * 24 * 3600_000,
}

export const BAR_WIDTH = 8

/** Bar cells for a terminal this wide: about one per 15 columns, 4 to 16; BAR_WIDTH when unknown. */
export function barWidthFor(columns: number | undefined): number {
  if (!columns) return BAR_WIDTH
  return Math.min(16, Math.max(4, Math.round(columns / 15)))
}

/** Milliseconds until reset, or undefined. */
export function msLeft(resetsAt: string | undefined, now: Date): number | undefined {
  if (!resetsAt) return undefined
  const t = new Date(resetsAt).getTime()
  if (Number.isNaN(t)) return undefined
  return Math.max(0, t - now.getTime())
}

/** "2h05m", "3d4h", "45m". */
export function formatLeft(ms: number): string {
  const totalMin = Math.floor(ms / 60_000)
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d}d${h}h`
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`
  return `${m}m`
}

/** One bar cell: whether the top (quota) and bottom (time) bars reach it. */
export type Cell = { top: boolean; bottom: boolean }

/** Top = quota left, bottom = time left, each a fraction of the window. */
export function barCells(quotaLeft: number, timeLeft: number | undefined, width = BAR_WIDTH): Cell[] {
  const cells = (f: number) => Math.round(Math.min(1, Math.max(0, f)) * width)
  const top = cells(quotaLeft)
  const bottom = timeLeft === undefined ? -1 : cells(timeLeft)
  return Array.from({ length: width }, (_, i) => ({ top: i < top, bottom: i < bottom }))
}

export function glyph(c: Cell): string {
  return c.top && c.bottom ? '█' : c.top ? '▀' : c.bottom ? '▄' : ' '
}

/**
 * Two bars stacked in one row with half blocks: top = quota left, bottom = time left.
 * A trailing ▀ means quota outlasts time (on pace); a trailing ▄ means quota runs out first.
 */
export function stackedBar(quotaLeft: number, timeLeft: number | undefined, width = BAR_WIDTH): string {
  return `▕${barCells(quotaLeft, timeLeft, width).map(glyph).join('')}▏`
}

/** What the band draws for one window. */
export type Meter = { label: string; cells: Cell[]; percentLeft: number; timeLeft?: string }

export function meters(limits: RateLimit[], now: Date, width = BAR_WIDTH): Meter[] {
  return sortLimits(limits).flatMap((limit) => {
    const window = WINDOW_MS[limit.kind]
    if (!window) return []
    const left = Math.max(0, 100 - limit.percentUsed)
    const ms = msLeft(limit.resetsAt, now)
    return [
      {
        label: labelFor(limit.kind),
        cells: barCells(left / 100, ms === undefined ? undefined : ms / window, width),
        percentLeft: Math.round(left),
        timeLeft: ms === undefined ? undefined : formatLeft(ms),
      },
    ]
  })
}

/** Status line text, or undefined to clear it. */
export function statusText(limits: RateLimit[], clock: Clock, now: Date = new Date()): string | undefined {
  if (limits.length === 0) return undefined
  const parts = sortLimits(limits).map((limit) => {
    const left = Math.max(0, 100 - limit.percentUsed)
    const window = WINDOW_MS[limit.kind]
    if (!window) return `${labelFor(limit.kind)} ${Math.round(limit.percentUsed)}%`
    const ms = msLeft(limit.resetsAt, now)
    const bar = stackedBar(left / 100, ms === undefined ? undefined : ms / window)
    const time = ms === undefined ? '' : ` ${formatLeft(ms)}`
    return `${labelFor(limit.kind)} ${bar} ${Math.round(left)}%${time}`
  })
  return parts.join('  ')
}

export function toastText(limit: RateLimit, clock: Clock): string {
  const time = resetTime(limit.resetsAt, clock)
  const resets = time ? `, resets ${time}` : ''
  return `Claude ${labelFor(limit.kind)} limit at ${Math.round(limit.percentUsed)}%${resets}. Good time to hand big tasks to Sonnet.`
}

/**
 * Toasts to send for these readings. `fired` holds, per kind, the highest threshold already
 * toasted. Dropping under the first threshold clears the entry so the window can warn again.
 * A reading past several thresholds sends only the highest one.
 */
export function dueToasts(limits: RateLimit[], fired: Map<string, number>, clock: Clock): string[] {
  const out: string[] = []
  for (const limit of sortLimits(limits)) {
    const crossed = THRESHOLDS.filter((t) => limit.percentUsed >= t)
    if (crossed.length === 0) {
      fired.delete(limit.kind)
      continue
    }
    const highest = crossed[crossed.length - 1] as number
    if (highest > (fired.get(limit.kind) ?? 0)) {
      fired.set(limit.kind, highest)
      out.push(toastText(limit, clock))
    }
  }
  return out
}

/** "850", "12k", "1.2M". */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

export type ContextUsage = { tokens?: number; window: number; percent?: number }

/** What the band draws for the context window, or undefined before the first response. */
export function contextMeter(
  ctx: ContextUsage | undefined,
  width = BAR_WIDTH,
): { filled: number; width: number; percent: number; text: string } | undefined {
  if (!ctx || ctx.tokens === undefined || !ctx.window) return undefined
  const percent = ctx.percent ?? Math.round((ctx.tokens / ctx.window) * 100)
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width)
  return { filled, width, percent, text: `${formatTokens(ctx.tokens)}/${formatTokens(ctx.window)}` }
}

/** "claude-opus-5-5[1m]" → "Opus 5.5"; anything else as given. */
export function prettyModel(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?/.exec(id)
  if (!m) return id
  const name = m[1]!.charAt(0).toUpperCase() + m[1]!.slice(1)
  return m[3] ? `${name} ${m[2]}.${m[3]}` : `${name} ${m[2]}`
}
