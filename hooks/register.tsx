import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'
import { dueToasts, glyph, localClock, meters, type Cell, type RateLimit } from './meter'

const QUOTA_COLOR = '#4FA3FF'
const TIME_COLOR = '#FF9F43'

const limitsAtom = atom({ plugin: 'meter-js', key: 'limits' } as const, [] as RateLimit[])
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
      const { rateLimits } = await $.session.usage()
      if (rateLimits.length > 0) await update($, limitsAtom, () => rateLimits)
    } catch {}
    // Keep the time bar moving between measurements.
    $.clock.every(60_000, () => update($, limitsAtom, (l) => [...l]))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    try {
      await update($, limitsAtom, () => e.rateLimits)
      for (const text of dueToasts(e.rateLimits, fired, localClock)) $.ui.toast(text)
    } catch {}
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const list = meters(await read($, limitsAtom), new Date(await $.clock.now()))
    if (list.length === 0) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        {list.map((m, i) => (
          <Box key={m.label}>
            <Text dimColor>{(i > 0 ? '  ' : '') + m.label} ▕</Text>
            {m.cells.map((c, j) => (
              <Text key={String(j)} {...cellColors(c)}>
                {c.top && c.bottom ? '▀' : glyph(c)}
              </Text>
            ))}
            <Text dimColor>▏ </Text>
            <Text color={QUOTA_COLOR}>{m.percentLeft}%</Text>
            {m.timeLeft ? <Text color={TIME_COLOR}> {m.timeLeft}</Text> : null}
          </Box>
        ))}
      </Box>
    )
  })
}
