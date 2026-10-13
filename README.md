# meter-js

**English** | [한국어](README.ko.md)

A Claude Code mod that shows your Claude usage as bars on the line under the prompt.

```
Opus 5.5 high 5h▕████▀▀  ▏ 7d▕███▀▀   ▏ C28%
```

## What it shows

- **Model · effort**: the main loop's model and current effort. Effort appears after the first request.
- **5h / 7d bars**: two bars stacked in one row.
  - Top (orange) = rate-limit quota left
  - Bottom (gray) = time left until reset
  - Orange (▀) alone at the end means quota outlasts time (on pace). Gray (▄) alone means quota is running out faster than time.
- **C%**: context window used. Red at 80% and above.
- Bars get their `5h`/`7d` labels on terminals 60 columns or wider, and are followed by the quota % and time left (`70% 2h30m`) at 85 or wider.
- Bar length follows terminal width, 5 to 10 cells.
- A toast when a 5h or weekly window first reaches 80% and 90%.

The hint line's `(shift+tab to cycle)` and `← for agents` are hidden. The permission mode label (`⏵⏵ auto mode on ·`) is drawn by Claude Code and cannot be changed.

## Install

```
/plugin marketplace add greenoceanplanet/meter-js
/plugin install meter-js@meter-js
```

Or straight from a local folder:

```
claude --plugin-dir <this folder>
```

Mods are not sandboxed. They run with the same access as Claude Code. Read the source before you install any mod.

## Notes

- Needs a Claude subscription. With an API key there are no rate-limit windows, so no bars are shown.
- Figures update after each response; the time bar redraws every minute.
- Colors are constants at the top of `hooks/register.tsx`; bar length is `barWidthFor` in `hooks/meter.ts`.

## Tests

```
claude plugin test .
```

## License

MIT. See `LICENSE`.
