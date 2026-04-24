# axiom-memory (CLI plugin)

Memory that survives every `/compact` and syncs across machines.

## Install

```bash
pip install axiom-memory
```

## Quick start

```bash
axiom-memory login        # opens browser, pairs this machine
axiom-memory status       # shows config + file count
axiom-memory push         # upload local ~/.claude/projects/.../memory
axiom-memory pull         # download on a second machine
axiom-memory sync         # push then pull
```

## Configuration

Config lives at `~/Library/Application Support/axiom-memory/config.json` (macOS) or the
platform equivalent. You can override:

- `AXIOM_API` — API endpoint (default: `https://axiom-memory.vercel.app`)
- `--memory-root` — alternative memory directory

## Pricing

- Free open source (`axiom-reflex`): hooks + skills + agents + MCPs, all local.
- Pro (`axiom-memory`, this package): $29/mo, cross-machine sync + semantic search.
- Launch price: $19/mo for the first 100 subscribers.

See [axiommemory.dev](https://axiommemory.dev).

## Development

```bash
pip install -e ".[dev]"
pytest
```
