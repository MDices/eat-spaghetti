#!/usr/bin/env node
// blast-radius — quem depende deste arquivo? (reverse imports + fan-in + cross-feature + co-change)
//
// Embutido na skill eat-spaghetti E reusável standalone:
//   node blast-radius.mjs <arquivo> [--root <dir>] [--json]
//   npx @mdices/eat-spaghetti-blast-radius <arquivo>
//
// Sem dependências externas (Node >= 18): fs + git via child_process + regex.
// Não muta nada — é análise read-only (serve à Fase 0 do guardrail e à Camada 1/5 da skill).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const SRC_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const INDEXES = SRC_EXTS.map((e) => `index${e}`);
const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'dev-dist', '.next',
  'coverage', '.turbo', '.cache', 'out',
]);
const CO_CHANGE_COMMIT_CAP = 40; // últimos N commits que tocaram o alvo

function parseArgs(argv) {
  const args = { root: process.cwd(), json: false, target: null, alias: { '@/': 'src/' } };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') args.root = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--alias') {
      const [k, v] = (argv[++i] || '').split('=');
      if (k && v) args.alias[k] = v;
    } else if (!a.startsWith('--')) args.target = a;
  }
  return args;
}

function collectSourceFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.') {
        if (IGNORE_DIRS.has(e.name)) continue;
      }
      if (e.isDirectory()) {
        if (IGNORE_DIRS.has(e.name)) continue;
        walk(join(dir, e.name));
      } else if (SRC_EXTS.some((ext) => e.name.endsWith(ext))) {
        out.push(join(dir, e.name));
      }
    }
  };
  walk(root);
  return out;
}

// Specifiers de import/export/require/dynamic-import de um arquivo.
function extractSpecifiers(content) {
  const specs = [];
  const patterns = [
    /\bimport\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g, // import x from '...'
    /\bexport\b[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g, // export ... from '...'
    /\bimport\s*['"]([^'"]+)['"]/g,                 // import '...' (side-effect)
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,          // import('...')
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,         // require('...')
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content))) specs.push(m[1]);
  }
  return specs;
}

// Chave normalizada p/ comparar caminhos (sem extensão, sem /index).
function normalizeKey(absPath) {
  let p = absPath.split(sep).join('/');
  for (const idx of INDEXES) {
    if (p.endsWith('/' + idx)) { p = p.slice(0, -(idx.length + 1)); return p; }
  }
  for (const ext of SRC_EXTS) {
    if (p.endsWith(ext)) return p.slice(0, -ext.length);
  }
  return p;
}

// Resolve um specifier (a partir do importador) p/ chave normalizada, ou null se for bare/externo.
function resolveSpecifier(spec, importerFile, root, alias) {
  let base = null;
  for (const [k, v] of Object.entries(alias)) {
    if (spec === k.replace(/\/$/, '') || spec.startsWith(k)) {
      base = resolve(root, v, spec.slice(k.length));
      break;
    }
  }
  if (base === null) {
    if (spec.startsWith('.')) base = resolve(dirname(importerFile), spec);
    else return null; // bare import (node_modules) — ignora
  }
  return normalizeKey(base);
}

// Classifica em zona (feature/shared/ui/other) + nome da feature.
// shared->feature é NORMAL (não conta como cross-feature); só feature->feature conta.
function zoneOf(absPath, root) {
  const rel = relative(root, absPath).split(sep).join('/');
  if (/^src\/components\/ui\//.test(rel)) return { zone: 'ui', feature: 'ui' };
  if (/^src\/(hooks|services|lib|contexts|integrations|utils|types|schemas|locales)(\/|$)/.test(rel)) {
    const m = rel.match(/^src\/([^/]+)/);
    return { zone: 'shared', feature: m ? m[1] : 'shared' };
  }
  let m = rel.match(/^src\/(?:components|pages|features)\/([^/]+)/);
  if (m) return { zone: 'feature', feature: m[1].replace(/\.(tsx?|jsx?)$/, '') };
  m = rel.match(/^src\/([^/]+)/);
  if (m) return { zone: 'feature', feature: m[1] };
  return { zone: 'other', feature: rel.split('/')[0] || '(root)' };
}

function gitCoChange(targetRel, root) {
  const tally = new Map();
  let hashes = [];
  try {
    const out = execFileSync('git', ['-C', root, 'log', `-n${CO_CHANGE_COMMIT_CAP}`, '--pretty=format:%H', '--', targetRel], { encoding: 'utf8' });
    hashes = out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { return []; }
  for (const h of hashes) {
    let files = [];
    try {
      const out = execFileSync('git', ['-C', root, 'show', '--name-only', '--pretty=format:', h], { encoding: 'utf8' });
      files = out.split('\n').map((s) => s.trim()).filter(Boolean);
    } catch { continue; }
    for (const f of files) {
      if (f === targetRel) continue;
      tally.set(f, (tally.get(f) || 0) + 1);
    }
  }
  return [...tally.entries()]
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

export function blastRadius(targetPath, opts = {}) {
  const root = resolve(opts.root || process.cwd());
  const alias = opts.alias || { '@/': 'src/' };
  const targetAbs = resolve(root, targetPath);
  const targetKey = normalizeKey(targetAbs);
  const targetRel = relative(root, targetAbs).split(sep).join('/');
  const target = zoneOf(targetAbs, root);

  const files = collectSourceFiles(root);
  const importers = [];
  for (const f of files) {
    if (normalizeKey(f) === targetKey) continue;
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    if (!content.includes('import') && !content.includes('require')) continue;
    for (const spec of extractSpecifiers(content)) {
      if (resolveSpecifier(spec, f, root, alias) === targetKey) {
        const z = zoneOf(f, root);
        // cross-feature de verdade: ambos são 'feature' e features diferentes.
        const crossFeature = target.zone === 'feature' && z.zone === 'feature' && z.feature !== target.feature;
        importers.push({ file: relative(root, f).split(sep).join('/'), zone: z.zone, feature: z.feature, crossFeature });
        break;
      }
    }
  }
  importers.sort((a, b) => Number(b.crossFeature) - Number(a.crossFeature) || a.file.localeCompare(b.file));

  return {
    target: targetRel,
    zone: target.zone,
    feature: target.feature,
    fanIn: importers.length,
    crossFeatureCount: importers.filter((i) => i.crossFeature).length,
    importers,
    coChange: gitCoChange(targetRel, root),
  };
}

function riskLabel(r) {
  if (r.crossFeatureCount > 0 && r.fanIn >= 8) return 'ALTO (muitos dependentes + cross-feature)';
  if (r.fanIn >= 12) return 'ALTO (fan-in alto)';
  if (r.crossFeatureCount > 0) return 'MÉDIO (tem importador cross-feature)';
  if (r.fanIn >= 5) return 'MÉDIO (fan-in moderado)';
  return 'BAIXO';
}

function printReport(r) {
  console.log(`\nBlast radius: ${r.target}  [zona: ${r.zone} / ${r.feature}]`);
  console.log(`Risco: ${riskLabel(r)}`);
  console.log(`Fan-in: ${r.fanIn} importador(es)  |  cross-feature (feature→feature): ${r.crossFeatureCount}`);
  if (r.importers.length) {
    console.log(`\nImportadores (cross-feature primeiro):`);
    for (const i of r.importers) console.log(`  ${i.crossFeature ? '⚠ ' : '  '}${i.file}  [${i.zone}/${i.feature}]`);
  } else {
    console.log(`\nNenhum importador encontrado (possível dead code, ou só entrypoint/dynamic).`);
  }
  if (r.coChange.length) {
    console.log(`\nCo-change (mudam junto no histórico — acoplamento que o import não mostra):`);
    for (const c of r.coChange) console.log(`  ${String(c.count).padStart(3)}×  ${c.file}`);
  }
  console.log('');
}

// CLI
const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('blast-radius.mjs');
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.target) {
    console.error('uso: blast-radius.mjs <arquivo> [--root <dir>] [--alias @/=src/] [--json]');
    process.exit(2);
  }
  const result = blastRadius(args.target, { root: args.root, alias: args.alias });
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else printReport(result);
}
