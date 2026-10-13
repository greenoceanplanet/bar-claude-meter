import { test, expect } from 'claude-code/testing'
import { barWidthFor, prettyModel, contextMeter, dueToasts, formatTokens, formatLeft, glyph, meters, stackedBar, statusText, type Clock, type RateLimit } from './meter'

// Fixed clock: reports UTC so results do not depend on the machine timezone.
const clock: Clock = (d) =>
  `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`

const R5 = '2026-10-02T18:40:00Z'
const five = (p: number, ...rest: [string | undefined] | []): RateLimit => ({
  kind: 'five_hour',
  percentUsed: p,
  resetsAt: rest.length ? rest[0] : R5,
})
const week = (p: number): RateLimit => ({ kind: 'seven_day', percentUsed: p, resetsAt: '2026-10-05T00:00:00Z' })

// 2h30m before R5: half the 5h window left.
const NOW = new Date('2026-10-02T16:10:00Z')

test('stacked bar: top = quota left, bottom = time left', () => {
  expect(stackedBar(1, 1, 10)).toBe('▕██████████▏')
  expect(stackedBar(0.7, 0.5, 10)).toBe('▕█████▀▀   ▏')
  expect(stackedBar(0.3, 0.5, 10)).toBe('▕███▄▄     ▏')
  expect(stackedBar(0.4, undefined, 10)).toBe('▕▀▀▀▀      ▏')
  expect(stackedBar(-1, 2, 10)).toBe('▕▄▄▄▄▄▄▄▄▄▄▏')
})

test('status text shapes', () => {
  expect(statusText([week(41), five(30)], clock, NOW)).toBe(
    '5h ▕████▀▀  ▏ 70% 2h30m  week ▕███▀▀   ▏ 59% 2d7h',
  )
  expect(statusText([five(30, undefined)], clock, NOW)).toBe('5h ▕▀▀▀▀▀▀  ▏ 70%')
  expect(statusText([{ kind: 'spend_limit', percentUsed: 120 }], clock, NOW)).toBe('spend 120%')
  expect(statusText([], clock, NOW)).toBeUndefined()
})

test('time formatting', () => {
  expect(formatLeft(45 * 60_000)).toBe('45m')
  expect(formatLeft(125 * 60_000)).toBe('2h05m')
  expect(formatLeft((3 * 1440 + 4 * 60) * 60_000)).toBe('3d4h')
})

test('toast thresholds', () => {
  const fired = new Map<string, number>()
  const step = (p: number) => dueToasts([five(p)], fired, clock)
  expect(step(79)).toEqual([])
  expect(step(80)).toEqual(['Claude 5h limit at 80%, resets 18:40. Good time to hand big tasks to Sonnet.'])
  expect(step(85)).toEqual([])
  expect(step(90)).toEqual(['Claude 5h limit at 90%, resets 18:40. Good time to hand big tasks to Sonnet.'])
  expect(step(95)).toEqual([])
})

test('jump past 90 sends only the 90 toast, then nothing', () => {
  const fired = new Map<string, number>()
  expect(dueToasts([five(75)], fired, clock)).toEqual([])
  expect(dueToasts([five(95)], fired, clock)).toEqual([
    'Claude 5h limit at 95%, resets 18:40. Good time to hand big tasks to Sonnet.',
  ])
  expect(dueToasts([five(96)], fired, clock)).toEqual([])
  expect(dueToasts([five(82)], fired, clock)).toEqual([])
})

test('dropping under 80 then rising warns again', () => {
  const fired = new Map<string, number>()
  expect(dueToasts([five(90)], fired, clock)).toHaveLength(1)
  expect(dueToasts([five(10)], fired, clock)).toEqual([])
  expect(dueToasts([five(80)], fired, clock)).toEqual([
    'Claude 5h limit at 80%, resets 18:40. Good time to hand big tasks to Sonnet.',
  ])
})

test('a shifted resetsAt does not repeat the toast', () => {
  const fired = new Map<string, number>()
  expect(dueToasts([five(85, '2026-10-02T18:40:00Z')], fired, clock)).toHaveLength(1)
  expect(dueToasts([five(85, '2026-10-02T18:40:03Z')], fired, clock)).toEqual([])
  expect(dueToasts([five(86, '2026-10-02T18:39:58Z')], fired, clock)).toEqual([])
})

test('windows are independent; no time drops the clause', () => {
  const fired = new Map<string, number>()
  expect(dueToasts([five(82)], fired, clock)).toHaveLength(1)
  expect(dueToasts([five(82), week(85)], fired, clock)).toEqual([
    'Claude week limit at 85%, resets 00:00. Good time to hand big tasks to Sonnet.',
  ])
  expect(dueToasts([five(85, undefined), week(85)], new Map(), clock)).toEqual([
    'Claude 5h limit at 85%. Good time to hand big tasks to Sonnet.',
    'Claude week limit at 85%, resets 00:00. Good time to hand big tasks to Sonnet.',
  ])
})

test('band meters: 5h and week only, sorted', () => {
  const list = meters([{ kind: 'spend_limit', percentUsed: 5 }, week(41), five(30)], NOW)
  expect(list.map((m) => [m.label, m.cells.map(glyph).join(''), m.percentLeft, m.timeLeft])).toEqual([
    ['5h', '████▀▀  ', 70, '2h30m'],
    ['week', '███▀▀   ', 59, '2d7h'],
  ])
  expect(meters([five(30, undefined)], NOW)[0]?.timeLeft).toBeUndefined()
})

test('context meter', () => {
  expect(contextMeter({ window: 200_000 })).toBeUndefined()
  expect(contextMeter({ tokens: 90_000, window: 200_000, percent: 45 }, 10)).toEqual({
    filled: 5, width: 10, percent: 45, text: '90k/200k',
  })
  expect(formatTokens(1_000_000)).toBe('1M')
  expect(formatTokens(850)).toBe('850')
})

test('model names', () => {
  expect(prettyModel('claude-opus-5-5')).toBe('Opus 5.5')
  expect(prettyModel('claude-sonnet-5-5[1m]')).toBe('Sonnet 5.5')
  expect(prettyModel('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
  expect(prettyModel('claude-fable-5-1')).toBe('Fable 5.1')
  expect(prettyModel('gpt-x')).toBe('gpt-x')
})

test('bar width follows the terminal', () => {
  expect(barWidthFor(undefined)).toBe(8)
  expect(barWidthFor(40)).toBe(5)
  expect(barWidthFor(120)).toBe(12)
  expect(barWidthFor(300)).toBe(16)
})
