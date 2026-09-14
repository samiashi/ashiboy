// Enforces the `@/` path alias: no relative module specifiers in source.
//
// typescript-eslint hard-crashes on TS 7 (and TS 7's own package no longer
// exposes the classic compiler API), so instead of an ESLint plugin this
// strips comments with a string-aware scanner and matches import/export
// statements. Zero dependencies.
//
//   npm run lint       check only (exit 1 on violations)
//   npm run lint:fix   rewrite resolvable relative specifiers to @/
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'src');
const SCAN_DIRS = ['src'];
const SCAN_FILES = ['vite.config.ts'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const FIX = process.argv.includes('--fix');

function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(full));
    else if (EXTENSIONS.has(extname(entry.name))) out.push(full);
  }
  return out;
}

// Removes // and /* */ comments, replacing their characters with spaces so
// offsets stay aligned with the original source. String contents (including
// URLs and `//` inside strings) are left untouched. Handles ', ", `,
// escapes, and ${} nesting inside template literals.
function stripComments(source) {
  let out = '';
  let i = 0;
  const n = source.length;
  const blank = (ch) => (ch === '\n' ? '\n' : ' ');
  while (i < n) {
    const c = source[i];
    const next = source[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && source[i] !== '\n') {
        out += ' ';
        i++;
      }
    } else if (c === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out += blank(source[i]);
        i++;
      }
      out += '  ';
      i += 2;
    } else if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      out += c;
      i++;
      let depth = 0;
      while (i < n) {
        const d = source[i];
        out += d;
        if (d === '\\') {
          out += source[i + 1] ?? '';
          i += 2;
          continue;
        }
        if (quote === '`' && d === '$' && source[i + 1] === '{') {
          depth++;
        } else if (quote === '`' && d === '}' && depth > 0) {
          depth--;
        } else if (d === quote && depth === 0) {
          i++;
          break;
        }
        i++;
      }
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

const PATTERNS = [
  /(?:import|export)\s[^;]*?\bfrom\s*(?<q>['"])(?<spec>\.[^'"]*)\k<q>/g, // import x from './y'
  /(^|[;\n}])\s*import\s*(?<q>['"])(?<spec>\.[^'"]+)\k<q>/g, // import './y' (side effect)
  /\bimport\s*\(\s*(?<q>['"])(?<spec>\.[^'"]+)\k<q>\s*\)/g, // import('./y') (dynamic)
  /\brequire\s*\(\s*(?<q>['"])(?<spec>\.[^'"]+)\k<q>\s*\)/g, // require('./y')
  /@import\s+(?<q>['"])(?<spec>\.[^'"]+)\k<q>/g, // CSS @import './y'
];

function offsetToLine(source, offset) {
  let line = 1;
  for (let i = 0; i < offset; i++) if (source[i] === '\n') line++;
  return line;
}

function findHits(file, source) {
  const hits = [];
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(source)) !== null) {
      const { q, spec } = m.groups;
      const quoted = `${q}${spec}${q}`;
      const start = m.index + m[0].lastIndexOf(quoted);
      hits.push({ start, end: start + quoted.length, spec, quote: q });
    }
  }
  return hits;
}

const RESOLVE_SUFFIXES = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function resolveTarget(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const suffix of RESOLVE_SUFFIXES) {
    const candidate = base + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  for (const index of ['index.ts', 'index.tsx', 'index.js', 'index.jsx']) {
    const candidate = join(base, index);
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function toAlias(targetFile) {
  const rel = relative(SRC, targetFile);
  if (rel === '' || rel.startsWith('..')) return null; // outside src — not aliasable
  const parts = rel.split(sep);
  const last = parts[parts.length - 1];
  const dot = last.lastIndexOf('.');
  parts[parts.length - 1] = dot > 0 ? last.slice(0, dot) : last;
  if (parts[parts.length - 1] === 'index') parts.pop();
  if (parts.length === 0) return null;
  return `@/${parts.join('/')}`;
}

const files = [
  ...SCAN_FILES.map((f) => join(ROOT, f)),
  ...SCAN_DIRS.flatMap((d) => collect(join(ROOT, d))),
];
let problems = 0;
let fixed = 0;

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const hits = findHits(file, stripComments(raw));
  if (hits.length === 0) continue;

  if (!FIX) {
    for (const h of hits) {
      console.error(
        `${relative(ROOT, file)}:${offsetToLine(raw, h.start)} — relative import '${h.spec}' (use @/ alias)`,
      );
      problems++;
    }
    continue;
  }

  // Apply rewrites back-to-front so offsets stay valid.
  const edits = [];
  for (const h of hits) {
    const target = resolveTarget(file, h.spec);
    const alias = target ? toAlias(target) : null;
    if (!alias) {
      console.error(
        `${relative(ROOT, file)}:${offsetToLine(raw, h.start)} — relative import '${h.spec}' (unresolvable, left alone)`,
      );
      problems++;
      continue;
    }
    edits.push({ ...h, replacement: `${h.quote}${alias}${h.quote}` });
  }
  if (edits.length === 0) continue;
  edits.sort((a, b) => b.start - a.start);
  let next = raw;
  for (const e of edits) next = next.slice(0, e.start) + e.replacement + next.slice(e.end);
  writeFileSync(file, next);
  fixed += edits.length;
  console.log(
    `${relative(ROOT, file)} — rewrote ${edits.length} import${edits.length === 1 ? '' : 's'} to @/`,
  );
}

if (problems > 0) process.exit(1);
console.log(
  FIX
    ? `OK — ${files.length} files checked, ${fixed} import${fixed === 1 ? '' : 's'} rewritten.`
    : `OK — ${files.length} files checked, no relative imports.`,
);
