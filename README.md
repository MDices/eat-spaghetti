# eat-spaghetti

Claude Code plugin for detecting and cleaning spaghetti code without breaking dependents.

Scoped analysis with quality score, characterization tests as safety net, and micro-step refactoring verified by loop-test.

## Install

```bash
npm install -g @mdices/eat-spaghetti
```

Restart Claude Code after installing. The skill is immediately available.

## Usage

In Claude Code, invoke reactively:

```
/eat:spaghetti <scope>
```

Or describe naturally: `"audita o módulo de carrinho"`, `"limpa esse arquivo"`.

A post-edit hook can also be configured for proactive mode — see `plugins/eat/skills/spaghetti/hooks/post-edit-check.md`.

## Manual install (GitHub marketplace)

Add to `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "mdices": {
      "source": { "source": "github", "repo": "mdices/eat-spaghetti" }
    }
  },
  "enabledPlugins": {
    "eat@mdices": true
  }
}
```

## What it does

- **Phase 0** — discovers scope (files + dependency tree, max 30 files)
- **Phase 1** — scores code quality (0–1) and lists findings by severity
- **Phase 2** — generates characterization tests to lock current behavior
- **Phase 3** — applies one refactoring at a time, runs tests between each step
- **Phase 4** — final validation and report

Never changes observable behavior. Never invents new abstractions.
