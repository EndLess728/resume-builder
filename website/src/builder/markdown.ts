// Port of rendercv/renderer/templater/markdown_parser.py.
//
// RenderCV runs python-markdown (with lists, headings and quotes switched off)
// over every line and serialises the tree to Typst. This covers the inline
// syntax people actually use in a resume: **bold**, *italic*, `code`,
// [links](url), <autolinks>, backslash escapes, and `!!! summary` blocks.

type Node =
  | { t: 'text'; v: string }
  | { t: 'strong' | 'em'; c: Node[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: Node[] };

const ESCAPABLE = new Set(['\\', '`', '*', '_', '{', '}', '[', ']', '(', ')', '>', '#', '+', '-', '.', '!']);
const isSpace = (ch: string | undefined) => ch === undefined || /\s/.test(ch);
const isWord = (ch: string | undefined) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch);

function findClosingBracket(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '\\') {
      i++;
      continue;
    }
    if (s[i] === '[') depth++;
    else if (s[i] === ']' && --depth === 0) return i;
  }
  return -1;
}

function findClosingRun(s: string, from: number, ch: string, n: number): number {
  for (let j = from; j < s.length; j++) {
    if (s[j] === '\\') {
      j++;
      continue;
    }
    if (s[j] !== ch) continue;
    let k = j;
    while (s[k] === ch) k++;
    const run = k - j;
    if (run >= n && !isSpace(s[j - 1]) && (ch !== '_' || !isWord(s[j + n]))) {
      return j + (run - n); // close on the innermost n characters
    }
    j = k - 1;
  }
  return -1;
}

function parseInline(s: string): Node[] {
  const out: Node[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf });
    buf = '';
  };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (ch === '\\' && ESCAPABLE.has(s[i + 1])) {
      buf += s[++i];
      continue;
    }

    if (ch === '`') {
      const end = s.indexOf('`', i + 1);
      if (end > i) {
        flush();
        out.push({ t: 'code', v: s.slice(i + 1, end) });
        i = end;
        continue;
      }
    }

    if (ch === '<') {
      const m = /^<((?:https?|ftp):\/\/[^>\s]+|mailto:[^>\s]+)>/.exec(s.slice(i));
      if (m) {
        flush();
        out.push({ t: 'link', href: m[1], c: [{ t: 'text', v: m[1] }] });
        i += m[0].length - 1;
        continue;
      }
    }

    if (ch === '[') {
      const close = findClosingBracket(s, i);
      if (close > 0 && s[close + 1] === '(') {
        const m = /^\(\s*<?([^\s)>]*)>?(?:\s+["'][^"']*["'])?\s*\)/.exec(s.slice(close + 1));
        if (m) {
          flush();
          out.push({ t: 'link', href: m[1], c: parseInline(s.slice(i + 1, close)) });
          i = close + m[0].length;
          continue;
        }
      }
    }

    if (ch === '*' || ch === '_') {
      let k = i;
      while (s[k] === ch) k++;
      const n = Math.min(k - i, 3);
      const before = s[i - 1];
      const after = s[k];
      const standalone = isSpace(before) && isSpace(after);
      const intraword = ch === '_' && isWord(before);
      if (!standalone && !intraword && !isSpace(after)) {
        const close = findClosingRun(s, i + n, ch, n);
        if (close > i + n) {
          flush();
          const inner = parseInline(s.slice(i + n, close));
          const node: Node =
            n === 3
              ? { t: 'strong', c: [{ t: 'em', c: inner }] }
              : { t: n === 2 ? 'strong' : 'em', c: inner };
          out.push(node);
          i = close + n - 1;
          continue;
        }
      }
      buf += s.slice(i, k);
      i = k - 1;
      continue;
    }

    buf += ch;
  }
  flush();
  return out;
}

const TYPST_COMMAND = /#([A-Za-z][^\s()\[]*)(\([^)]*\))?(\[[^\]]*\])?/g;
const MATH = /(\$\$.*?\$\$)/g;
const ESCAPES: Record<string, string> = {
  '[': '\\[',
  ']': '\\]',
  '\\': '\\\\',
  '"': '\\"',
  '#': '\\#',
  $: '\\$',
  '@': '\\@',
  '%': '\\%',
  '~': '\\~',
  _: '\\_',
  '/': '\\/',
  '>': '\\>',
  '<': '\\<',
};

export function escapeTypst(input: string): string {
  if (input === '\n') return input;
  let s = input;
  const keep: [string, string][] = [];
  const matches = [...s.matchAll(MATH), ...s.matchAll(TYPST_COMMAND)].map((m) => m[0]);
  matches.forEach((m, i) => {
    const dummy = `RENDERCVTYPSTCOMMANDORMATH${i}`;
    s = s.split(m).join(dummy);
    keep.push([dummy, m.replaceAll('$$', '$')]);
  });
  s = [...s].map((c) => ESCAPES[c] ?? c).join('');
  s = s.split('* ').join('#sym.ast.basic ');
  s = s.split('*').join('#sym.ast.basic#h(0pt, weak: true) ');
  for (const [dummy, cmd] of keep) s = s.split(dummy).join(cmd);
  return s;
}

function toTypst(nodes: Node[]): string {
  return nodes
    .map((n) => {
      switch (n.t) {
        case 'text':
          return escapeTypst(n.v);
        case 'strong':
          return `#strong[${toTypst(n.c)}]`;
        case 'em':
          return `#emph[${toTypst(n.c)}]`;
        case 'code':
          return '`' + n.v + '`';
        case 'link':
          return `#link("${n.href || 'https://example.com'}")[${toTypst(n.c)}]`;
      }
    })
    .join('');
}

const convertLine = (line: string) => toTypst(parseInline(line.trim()));

export function markdownToTypst(md: string): string {
  const src = md.split('\n');
  const out: string[] = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i].startsWith('!!!')) {
      const body: string[] = [];
      while (i + 1 < src.length && src[i + 1].startsWith('    ')) body.push(src[++i].slice(4));
      const text = body
        .map((l) => l.trim())
        .filter(Boolean)
        .map(convertLine)
        .join(' \\ ');
      out.push(`#summary[${text}]`);
    } else {
      out.push(convertLine(src[i]));
    }
  }
  return out.join('\n');
}
