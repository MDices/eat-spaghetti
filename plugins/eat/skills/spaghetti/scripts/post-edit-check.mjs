#!/usr/bin/env node
// eat-spaghetti — post-edit circuit-breaker (porta cross-platform do post-edit-check.ps1)
//
// Lê o payload do hook em stdin como JSON: { tool_name, tool_input: { file_path, new_string?, content? } }
// Filtros baratos (volume + sinais de risco por regex). Sai:
//   - 0 silencioso se a edição não for interessante
//   - 2 com uma mensagem nomeando os sinais → o harness mostra ao agente, que então
//     invoca a skill eat-spaghetti no arquivo (Fases 0-1).
//
// Cross-agente: o Claude chama via hook PostToolUse; Codex/Antigravity via seus próprios
// mecanismos de hook; o CI pode chamar passando um JSON `{tool_name,tool_input:{file_path}}`.
// Node >= 18, sem dependências.

import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';

const OK = 0, FLAG = 2;
function done(code) { process.exit(code); }

if (process.env.EAT_SPAGHETTI_OFF === '1') done(OK);

const CODE_EXTS = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'kt', 'swift', 'rb', 'php', 'cs'];
const DECL_RE = /(^|\n)\s*(function|class|def|interface|type|const\s+\w+\s*=\s*\(|fn\s+\w+|func\s+\w+)/;
const MAX_FILE_BYTES = 512_000;
const MIN_CHANGE_CHARS = 600;

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  try {
    for await (const c of process.stdin) chunks.push(c);
  } catch { return ''; }
  return Buffer.concat(chunks).toString('utf8');
}

function detectSignals(content, ext) {
  const signals = [];
  if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(content)) signals.push('empty-catch');
  if ((ext === 'ts' || ext === 'tsx') && (/:\s*any\b/.test(content) || /\bas\s+any\b/.test(content))) signals.push('any-escape');
  if (/\/\/\s*(TODO|FIXME|HACK|XXX|GAMBIARRA)\b/im.test(content) || /#\s*(TODO|FIXME|HACK|XXX)\b/im.test(content)) signals.push('todo-marker');

  // long function (>=50 linhas): acha decls de função e mede até o próximo "\n}"
  const fnRe = /(function\s+\w+|^\s*\w+\s*=\s*\([^)]*\)\s*=>|def\s+\w+|func\s+\w+)[^\n]*\{/gm;
  let m;
  while ((m = fnRe.exec(content))) {
    const tail = content.slice(m.index);
    const endIdx = tail.indexOf('\n}');
    if (endIdx > 0) {
      const lines = tail.slice(0, endIdx).split('\n').length;
      if (lines >= 50) { signals.push('long-function'); break; }
    }
  }

  const jsLike = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'];
  if (jsLike.includes(ext) && /(?<![\w.])console\.log\(/.test(content)) signals.push('stray-log');
  if (ext === 'py' && /^\s*print\(/m.test(content)) signals.push('stray-print');
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext) &&
      /useEffect\(\s*\(\s*\)\s*=>\s*\{[^}]*\b(props|state|set\w+)\b[^}]*\}\s*,\s*\[\s*\]/.test(content)) {
    signals.push('useeffect-deps');
  }
  return [...new Set(signals)];
}

const payload = await readStdin();
if (!payload) done(OK);

let data;
try { data = JSON.parse(payload); } catch { done(OK); }

if (!['Edit', 'Write', 'MultiEdit'].includes(data?.tool_name)) done(OK);
const filePath = data?.tool_input?.file_path;
if (!filePath) done(OK);

let st;
try { st = statSync(filePath); } catch { done(OK); }

// Filtro A: tipo de arquivo + volume
const ext = extname(filePath).replace(/^\./, '').toLowerCase();
if (!CODE_EXTS.includes(ext)) done(OK);

const changed = (data.tool_input.new_string?.length ?? 0) + (data.tool_input.content?.length ?? 0);
const hasDecl = DECL_RE.test(data.tool_input.new_string ?? '') || DECL_RE.test(data.tool_input.content ?? '');
if (changed < MIN_CHANGE_CHARS && !hasDecl) done(OK);

// Filtro B: pula arquivos enormes (bundles/gerado); roda os sinais de risco
if (st.size > MAX_FILE_BYTES) done(OK);
let content;
try { content = readFileSync(filePath, 'utf8'); } catch { done(OK); }
if (!content) done(OK);

const signals = detectSignals(content, ext);
if (signals.length === 0) done(OK);

// Filtro C: surface
console.error(`[eat-spaghetti] signals in ${filePath} -> ${signals.join(', ')}`);
console.error('Invoke the eat-spaghetti skill on this file to run Phases 0-1.');
done(FLAG);
