# Post-Edit Circuit-Breaker — Install Guide

This hook runs `post-edit-check.ps1` after every `Edit`, `Write`, or `MultiEdit` tool call. The script does cheap regex filters (volume + risk signals) and only surfaces a message when something interesting is found. When it surfaces a message, Claude will see it and is expected to invoke the `eat-spaghetti` skill on the affected file.

## Install (via `update-config` skill)

Ask Claude: **"use update-config to install the eat-spaghetti post-edit hook"**, or add the following block manually to `~/.claude/settings.json` (or the project-local `.claude/settings.json`):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "pwsh -NoProfile -File \"C:\\DriveD\\utils\\skills\\eat-spaghetti\\hooks\\post-edit-check.ps1\""
          }
        ]
      }
    ]
  }
}
```

## How it works

1. Claude Code calls the hook after the tool runs.
2. The hook receives a JSON payload on stdin with `tool_name` and `tool_input.file_path`.
3. **Filter A (free):** skip non-code extensions, skip small diffs without a new declaration.
4. **Filter B (cheap regex):** scan the final file content for: empty catch, `any`/`as any`, TODO markers, long functions, stray `console.log`/`print`, `useEffect` with bad deps.
5. **Filter C:** if any signal, exit code 2 with a message naming the signals. Otherwise exit 0 silently.

When the hook exits non-zero, Claude Code shows the message to Claude in a `<system-reminder>`. The expected behavior is for Claude to then invoke the `eat-spaghetti` skill scoped to that file.

## Disable temporarily

Set `EAT_SPAGHETTI_OFF=1` in the environment for the current session:

```powershell
$env:EAT_SPAGHETTI_OFF = '1'
```

The script exits immediately when this var is set.

## Tuning

The volume cutoff (600 chars), the file extension allow-list, and the signal regexes all live in `post-edit-check.ps1`. Edit them directly; there is no separate config file. Keep the script cheap — anything you add runs on every edit.

## Why a hook, not a skill rule

Hooks are guaranteed by the harness. Skill rules can be forgotten by the model under context pressure. The proactive mode is the kind of behavior that must always run, so it lives in the hook layer.
