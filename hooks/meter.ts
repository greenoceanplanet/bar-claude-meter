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

export const BAR_WIDTH = 10

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

/**
 * Two thin bars stacked in one row with braille dots: top = quota left (dot row 2),
 * bottom = time left (dot row 3). Each cell holds two dot columns, so the resolution is 2 × width.
 * Bare top dots at the end mean quota outlasts time; bare bottom dots mean quota runs out first.
 */
export function stackedBar(quotaLeft: number, timeLeft: number | undefined, width = BAR_WIDTH): string {
  const steps = (f: number) => Math.round(Math.min(1, Math.max(0, f)) * width * 2)
  const top = steps(quotaLeft)
  const bottom = timeLeft === undefined ? -1 : steps(timeLeft)
  let out = ''
  for (let i = 0; i < width; i++) {
    const l = 2 * i
    const r = l + 1
    let bits = 0
    if (l < top) bits |= 0x02
    if (r < top) bits |= 0x10
    if (l < bottom) bits |= 0x04
    if (r < bottom) bits |= 0x20
    out += String.fromCharCode(0x2800 + bits)
  }
  return `▕${out}▏`
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
