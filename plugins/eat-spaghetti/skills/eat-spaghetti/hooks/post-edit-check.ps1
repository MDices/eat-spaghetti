# eat-spaghetti — post-edit circuit-breaker
# Invoked by Claude Code as a PostToolUse hook on Edit/Write.
# Reads tool input from stdin as JSON: { tool_name, tool_input: { file_path, ... } }
# Exits 0 silently if the edit is uninteresting.
# Exits non-zero with a short message naming the signals — the harness shows this to Claude,
# which then invokes the eat-spaghetti skill on the file.

if ($env:EAT_SPAGHETTI_OFF -eq '1') { exit 0 }

$payload = [Console]::In.ReadToEnd()
if (-not $payload) { exit 0 }

try { $data = $payload | ConvertFrom-Json } catch { exit 0 }

$toolName = $data.tool_name
if ($toolName -notin @('Edit', 'Write', 'MultiEdit')) { exit 0 }

$filePath = $data.tool_input.file_path
if (-not $filePath) { exit 0 }
if (-not (Test-Path $filePath)) { exit 0 }

# --- Filter A: volume / file type ---

$ext = [System.IO.Path]::GetExtension($filePath).TrimStart('.').ToLower()
$codeExts = @('ts','tsx','js','jsx','mjs','cjs','py','go','rs','java','kt','swift','rb','php','cs')
if ($ext -notin $codeExts) { exit 0 }

# Best-effort: estimate change size by file size delta. If unavailable, use new_string length.
$changedSize = 0
if ($data.tool_input.new_string) { $changedSize += $data.tool_input.new_string.Length }
if ($data.tool_input.content)    { $changedSize += $data.tool_input.content.Length }
# Heuristic: less than ~600 chars (~20 lines) and no new declaration in the patch → skip
$declRegex = '(^|\n)\s*(function|class|def|interface|type|const\s+\w+\s*=\s*\(|fn\s+\w+|func\s+\w+)'
$hasDecl = $false
if ($data.tool_input.new_string) {
  $hasDecl = ($data.tool_input.new_string -match $declRegex)
}
if ($data.tool_input.content) {
  $hasDecl = $hasDecl -or ($data.tool_input.content -match $declRegex)
}
if ($changedSize -lt 600 -and -not $hasDecl) { exit 0 }

# --- Filter B: risk signals on the final file content ---

# Skip very large files (minified bundles, generated code) — analysis would be wasteful and risky.
try {
  $fileInfo = Get-Item -LiteralPath $filePath -ErrorAction Stop
  if ($fileInfo.Length -gt 512000) { exit 0 }
} catch { exit 0 }

$content = Get-Content -Raw -LiteralPath $filePath -ErrorAction SilentlyContinue
if (-not $content) { exit 0 }

$signals = @()

# Empty catch
if ($content -match 'catch\s*\([^)]*\)\s*\{\s*\}') { $signals += 'empty-catch' }

# `: any` or `as any` (TypeScript)
if ($ext -in @('ts','tsx') -and ($content -match ':\s*any\b' -or $content -match '\bas\s+any\b')) {
  $signals += 'any-escape'
}

# TODO/FIXME/HACK/XXX/gambiarra
if ($content -match '(?im)//\s*(TODO|FIXME|HACK|XXX|GAMBIARRA)\b') { $signals += 'todo-marker' }
if ($content -match '(?im)#\s*(TODO|FIXME|HACK|XXX)\b') { $signals += 'todo-marker' }

# Touched function ≥ 50 lines — cheap proxy: any function whose braces span 50+ newlines
$longFnMatches = [regex]::Matches($content, '(?ms)(function\s+\w+|^\s*\w+\s*=\s*\([^)]*\)\s*=>|def\s+\w+|func\s+\w+)[^\n]*\{')
foreach ($m in $longFnMatches) {
  $tail = $content.Substring($m.Index)
  $endIdx = $tail.IndexOf("`n}")
  if ($endIdx -gt 0) {
    $body = $tail.Substring(0, $endIdx)
    $lines = ($body -split "`n").Count
    if ($lines -ge 50) { $signals += 'long-function'; break }
  }
}

# Stray console.log / print
if ($ext -in @('ts','tsx','js','jsx','mjs','cjs') -and $content -match '(?<![\w.])console\.log\(') {
  $signals += 'stray-log'
}
if ($ext -eq 'py' -and $content -match '(?m)^\s*print\(') {
  $signals += 'stray-print'
}

# useEffect with empty or missing deps
if ($ext -in @('ts','tsx','js','jsx') -and $content -match 'useEffect\(\s*\(\s*\)\s*=>\s*\{[^}]*\b(props|state|set\w+)\b[^}]*\}\s*,\s*\[\s*\]') {
  $signals += 'useeffect-deps'
}

if ($signals.Count -eq 0) { exit 0 }

# --- Filter C: surface ---

$unique = $signals | Sort-Object -Unique
$list = $unique -join ', '
Write-Host "[eat-spaghetti] signals in $filePath -> $list"
Write-Host "Invoke the eat-spaghetti skill on this file to run Phases 0-1."
exit 2
