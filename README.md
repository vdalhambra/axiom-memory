# axiom-memory

Claude Code memory that survives `/compact` and every session restart. Pre-compact state capture + cloud sync + team pattern sharing.

**Status:** Day 1 — landing + waitlist live. Plugin shipping week of 2026-04-28.

## The problem

- [68 minutes/day re-explaining code](https://devblogs.microsoft.com/all-things-azure/i-wasted-68-minutes-a-day-re-explaining-my-code-then-i-built-auto-memory/) to Claude after compactions
- [59 compactions in 26 days](https://github.com/anthropics/claude-code/issues/34556) in a single project
- Thread IDs, decisions, patterns — all lost every compact

## The product

- **Free tier (OSS):** plugin + local SQLite. Pre-compact hook saves. SessionStart hook restores. Pattern library you own.
- **Pro tier ($29/mo, launch $19/mo):** cloud sync across machines, semantic search, durable checkpoint.
- **Team tier ($79/mo/workspace):** shared pattern library, review workflow, SSO.

## Build log

- 2026-04-24: landing live at axiommemory.dev. Waitlist open.
- 2026-04-25-26: Supabase schema + Polar product live.
- 2026-04-27-28: Plugin v0.1 (`pip install axiom-memory`).
- 2026-04-29+: public launch, Show HN, Medium/DEV, listings.

## Links

- Website: https://axiommemory.dev (deployed soon)
- Related open source: https://github.com/vdalhambra/axiom-reflex
- Twitter: [@axiom_ia](https://x.com/axiom_ia)

## License

Plugin: Apache 2.0. Backend (cloud sync): proprietary.
