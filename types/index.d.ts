export type ContextUsage = { tokens?: number; window: number; percent?: number }
export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'bar-claude-meter': { limits: RateLimit[]; context: ContextUsage | null; model: string | null; effort: string | null }
  }
}
