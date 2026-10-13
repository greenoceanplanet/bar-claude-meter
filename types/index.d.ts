export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'meter-js': { limits: RateLimit[] }
  }
}
