import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'
import { barWidthFor, contextMeter, prettyModel, dueToasts, glyph, localClock, meters, type Cell, type ContextUsage, type RateLimit } from './meter'

const QUOTA_COLOR = '#D97757'
const TIME_COLOR = '#808080'
/** Terminal width from which each bar also shows its quota % and time left. */
/** Terminal width from which each bar shows its 5h / 7d label. */
const LABELS_MIN_COLUMNS = 70
const NUMBERS_MIN_COLUMNS = 88
const CTX_COLOR = '#7BD88F'
const CTX_WARN_COLOR = '#FF5F5F'

const limitsAtom = atom({ plugin: 'meter-js', key: 'limits' } as const, [] as RateLimit[])
const contextAtom = atom({ plugin: 'meter-js', key: 'context' } as const, null as ContextUsage | null)
const modelAtom = atom({ plugin: 'meter-js', key: 'model' } as const, null as string | null)
const effortAtom = atom({ plugin: 'meter-js', key: 'effort' } as const, null as string | null)
const fired = new Map<string, number>()

/** Top half takes the glyph color, bottom half the background, so each bar keeps its own color. */
function cellColors(c: Cell): { color?: string; backgroundColor?: string } {
  if (c.top && c.bottom) return { color: QUOTA_COLOR, backgroundColor: TIME_COLOR }
  if (c.top) return { color: QUOTA_COLOR }
  if (c.bottom) return { color: TIME_COLOR }
  return {}
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    try {
      const { rateLimits, context } = await $.session.usage()
      if (rateLimits.length > 0) await update($, limitsAtom, () => rateLimits)
      await update($, contextAtom, () => context)
    } catch { }
    try {
      const model = await $.session.model()
      await update($, modelAtom, () => model)
      $.ui.invalidate('ui.render')
    } catch { }
    // Keep the time bar moving between measurements.
    $.clock.every(60_000, () => $.ui.invalidate('ui.render'))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    try {
      await update($, limitsAtom, () => e.rateLimits)
      await update($, contextAtom, () => e.context)
      $.ui.invalidate('ui.render')
      for (const text of dueToasts(e.rateLimits, fired, localClock)) $.ui.toast(text)
    } catch { }
    return next(e)
  })

  // The main loop's model and effort as each request goes out (subagents skipped).
  on('turn.step', async function* ($, e, next) {
    if (!e.agentId) {
      try {
        await update($, modelAtom, () => e.model)
        await update($, effortAtom, () => (e.effort === undefined ? null : String(e.effort)))
        $.ui.invalidate('ui.render')
      } catch { }
    }
    return yield* next(e)
  })

  // Drawn in place of the hint line under the prompt; the engine's hint text follows, dim.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const list = meters(await read($, limitsAtom), new Date(await $.clock.now()), barWidthFor(e.viewport?.columns))
    const ctx = contextMeter((await read($, contextAtom)) ?? undefined)
    const hint = e.props.hint.replace(/\s*\(shift\+tab to cycle\)/g, '')
      .replace(/\s*·?\s*← for agents/g, '')
      .trim()
    const model = await read($, modelAtom)
    const effort = await read($, effortAtom)
    if (list.length === 0 && !ctx && !model) return next(e)
    const showLabels = (e.viewport?.columns ?? 0) >= LABELS_MIN_COLUMNS
    const showNumbers = (e.viewport?.columns ?? 0) >= NUMBERS_MIN_COLUMNS
    const ctxColor = ctx && ctx.percent >= 80 ? CTX_WARN_COLOR : CTX_COLOR
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        {model ? (
          <Box key="model">
            <Text bold>{prettyModel(model)}</Text>
            {effort ? <Text dimColor> {effort}</Text> : null}
          </Box>
        ) : null}
        {list.map((m, i) => (
          <Box key={m.label}>
            <Text dimColor>{(i > 0 || model ? ' ' : '') + (showLabels ? (m.label === 'week' ? '7d' : m.label) : '')}▕</Text>
            {m.cells.map((c, j) => (
              <Text key={String(j)} {...cellColors(c)}>
                {c.top && c.bottom ? '▀' : glyph(c)}
              </Text>
            ))}
            <Text dimColor>▏</Text>
            {showNumbers ? <Text color={QUOTA_COLOR}>{m.percentLeft}%</Text> : null}
            {showNumbers && m.timeLeft ? <Text color={TIME_COLOR}> {m.timeLeft}</Text> : null}
          </Box>
        ))}
        {ctx ? (
          <Box key="ctx">
            <Text color={ctxColor}>{(list.length > 0 || model ? ' ' : '') + `C${ctx.percent}%`}</Text>
          </Box>
        ) : null}
        {hint ? <Text dimColor>{'  ' + hint}</Text> : null}
      </Box>
    )
  })
}
