// Turns an uploaded resume (PDF, Word or plain text) into a flat list of
// lines with a little layout information. The parser in parse.ts works on
// these lines only, so it doesn't care which format the file was.

export interface Line {
  text: string; // segments that sat far apart on the same row are joined with \t
  x: number; // left edge, in points (0 for formats without positions)
  size: number; // font size, in points
  bold: boolean;
  bullet: boolean; // started with a bullet glyph or was a list item (glyph removed)
  gap: number; // vertical space above, in multiples of the line height (0 = unknown)
  links: { text: string; url: string }[];
  segX?: number[]; // PDF only: where each \t-separated segment starts
}

export interface Extracted {
  lines: Line[];
  twoColumn: boolean;
}

// •, ▪, ●, ◦, -, *, ➢, ✓ … and private-use glyphs from Symbol/Wingdings fonts
const BULLET_RE = /^\s*(?:[•●▪◦‣∙·○■□►▸▹➢➤✓✔❖◆◇⁃–—*\-]|[-]|\d{1,2}[.)])\s*/u;
export const startsWithBullet = (s: string) => BULLET_RE.test(s) && s.replace(BULLET_RE, '').trim().length > 0;
export const stripBullet = (s: string) => s.replace(BULLET_RE, '').trim();

const clean = (s: string) =>
  s
    .replace(/[   ]/g, ' ')
    .replace(/[​-‍﻿]/g, '')
    .replace(/ {3,}|\s*\t\s*/g, '\t')
    .replace(/ {2,}/g, ' ')
    .replace(/^\t+|\t+$/g, '')
    .trim();

function makeLine(raw: string, extra: Partial<Line> = {}): Line | null {
  const text = clean(raw);
  if (!text) return null;
  // A dash followed by a digit is more likely a negative number or a range than a bullet.
  const bullet = extra.bullet || (startsWithBullet(text) && !/^[-–—]\s*\d/.test(text));
  return {
    x: 0,
    size: 11,
    bold: false,
    gap: 0,
    links: [],
    ...extra,
    text: bullet ? stripBullet(text) : text,
    bullet,
  };
}

// ---------- plain text ----------

export function extractText(text: string): Extracted {
  const lines: Line[] = [];
  let blank = 0;
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!raw.trim()) {
      blank++;
      continue;
    }
    const l = makeLine(raw, { gap: blank ? 2 : 1 });
    if (l) lines.push(l);
    blank = 0;
  }
  return { lines, twoColumn: false };
}

// ---------- Word (.docx) via mammoth's HTML ----------

const decode = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, '&');

export function extractDocxHtml(html: string): Extracted {
  const lines: Line[] = [];
  html = html.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/g, (_, row: string) => {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => decode(c[1].replace(/<\/p>\s*<p[^>]*>/g, ', ')).replace(/\s+/g, ' ').trim());
    return `<p>${cells.filter(Boolean).join('\t').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`;
  });
  const BLOCK = /<(p|h[1-6]|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = BLOCK.exec(html))) {
    const [, tag, inner] = m;
    if (tag === 'li' && /<(p|h[1-6])[\s>]/.test(inner)) continue; // nested blocks are matched on their own
    const links = [...inner.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((a) => ({ url: decode(a[1]), text: clean(decode(a[2])) }));
    const plain = decode(inner);
    const bold = /^\s*<strong>[\s\S]*<\/strong>\s*$/.test(inner) && !/<\/strong>[\s\S]*\S[\s\S]*<strong>/.test(inner.replace(/^\s*<strong>|<\/strong>\s*$/g, ''));
    const size = tag === 'h1' ? 20 : tag === 'h2' ? 16 : tag.startsWith('h') ? 14 : 11;
    plain.split('\n').forEach((part, i) => {
      const l = makeLine(part, { bold: bold || tag.startsWith('h'), size, bullet: tag === 'li' && i === 0, gap: 1, links });
      if (l) lines.push(l);
    });
  }
  return { lines, twoColumn: false };
}

export async function extractDocx(data: ArrayBuffer): Promise<Extracted> {
  // @ts-expect-error mammoth's browser build has no types
  const mammoth = (await import('mammoth/mammoth.browser.js')).default;
  const { value } = await mammoth.convertToHtml({ arrayBuffer: data });
  return extractDocxHtml(value);
}

// ---------- PDF via pdf.js ----------

interface Item {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  url?: string;
}

interface Row {
  y: number;
  h: number;
  segments: Item[][]; // runs of items separated by wide gaps
}

const DATE_ONLY = /^[\s(]*((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s,']*\d{2,4}|\d{1,2}[/.-]\d{4}|\d{4})?\s*([-–—]|to)?\s*((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s,']*\d{2,4}|\d{1,2}[/.-]\d{4}|\d{4}|present|current|now)?[\s)]*$/i;

function rowsOf(items: Item[]): Row[] {
  const sorted = items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: { y: number; h: number; items: Item[] }[] = [];
  for (const it of sorted) {
    const row = rows.find((r) => Math.abs(r.y - it.y) < Math.max(2, Math.min(r.h, it.h) * 0.45));
    if (row) {
      row.items.push(it);
      row.h = Math.max(row.h, it.h);
    } else rows.push({ y: it.y, h: it.h, items: [it] });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) => {
      const its = r.items.sort((a, b) => a.x - b.x);
      const segments: Item[][] = [[its[0]]];
      for (let i = 1; i < its.length; i++) {
        const prev = its[i - 1];
        const gap = its[i].x - (prev.x + prev.w);
        if (gap > Math.max(r.h, 6) * 1.5) segments.push([its[i]]);
        else segments[segments.length - 1].push(its[i]);
      }
      return { y: r.y, h: r.h, segments };
    });
}

function segmentText(seg: Item[]): string {
  let out = '';
  seg.forEach((it, i) => {
    if (i > 0) {
      const prev = seg[i - 1];
      const gap = it.x - (prev.x + prev.w);
      if (gap > it.h * 0.15 && !out.endsWith(' ') && !it.str.startsWith(' ')) out += ' ';
    }
    out += it.str;
  });
  return out;
}

/** Find a vertical gutter that splits most rows into a left and right column. */
function findGutter(rows: Row[], pageWidth: number): number | null {
  const starts: number[] = [];
  for (const r of rows) {
    for (const seg of r.segments.slice(1)) {
      const text = segmentText(seg);
      if (!DATE_ONLY.test(text) && text.length > 3) starts.push(Math.round(seg[0].x));
    }
  }
  if (starts.length < 4) return null;
  const counts = new Map<number, number>();
  for (const s of starts) {
    const key = Math.round(s / 12) * 12;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [best, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (n < Math.max(4, rows.length * 0.15) || best < pageWidth * 0.2 || best > pageWidth * 0.75) return null;
  return best - 8;
}

export async function extractPdf(data: ArrayBuffer, pdfjs: any): Promise<Extracted> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data), verbosity: 0, isEvalSupported: false }).promise;
  const lines: Line[] = [];
  let twoColumn = false;
  let totalChars = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const [content, annots] = await Promise.all([page.getTextContent(), page.getAnnotations().catch(() => [])]);
    const links = (annots as any[])
      .filter((a) => a.subtype === 'Link' && typeof a.url === 'string')
      .map((a) => ({ url: a.url as string, rect: a.rect as number[] }));

    const items: Item[] = (content.items as any[])
      .filter((it) => typeof it.str === 'string')
      .map((it) => {
        const x = it.transform[4];
        const y = it.transform[5];
        const h = Math.abs(it.height) || Math.abs(it.transform[3]) || 10;
        const w = it.width;
        const cx = x + w / 2;
        const cy = y + h / 3;
        const link = links.find((l) => cx >= l.rect[0] - 1 && cx <= l.rect[2] + 1 && cy >= l.rect[1] - 2 && cy <= l.rect[3] + 2);
        return { str: it.str, x, y, w, h, url: link?.url };
      });
    totalChars += items.reduce((n, i) => n + i.str.trim().length, 0);

    let rows = rowsOf(items);
    const gutter = findGutter(rows, viewport.width);
    let ordered: { row: Row; segs: Item[][] }[];
    if (gutter !== null) {
      twoColumn = true;
      // Rows that start right of the gutter, or segments right of it, go to the right column.
      const left: { row: Row; segs: Item[][] }[] = [];
      const right: { row: Row; segs: Item[][] }[] = [];
      for (const row of rows) {
        const l = row.segments.filter((s) => s[0].x < gutter);
        const r = row.segments.filter((s) => s[0].x >= gutter);
        const spansBoth = l.length && l[l.length - 1].some((it) => it.x + it.w > gutter + 20);
        if (spansBoth) left.push({ row, segs: row.segments });
        else {
          if (l.length) left.push({ row, segs: l });
          if (r.length) right.push({ row, segs: r });
        }
      }
      ordered = [...left, ...right];
    } else {
      ordered = rows.map((row) => ({ row, segs: row.segments }));
    }

    let prev: { y: number; h: number } | null = null;
    for (const { row, segs } of ordered) {
      const text = segs.map(segmentText).join('\t');
      const linkList = segs.flat().filter((i) => i.url).map((i) => ({ text: clean(i.str), url: i.url! }));
      const gap = prev && prev.y > row.y ? (prev.y - row.y) / Math.max(row.h, 1) : 0;
      const l = makeLine(text, { x: segs[0][0].x, size: Math.round(row.h * 10) / 10, gap, links: linkList, segX: segs.map((sg) => sg[0].x) });
      if (l) {
        // For bullets, the text starts after the glyph: remember where, to spot wrapped lines.
        if (l.bullet) {
          const its = segs[0].filter((it) => it.str.trim());
          const first = its[0];
          if (its.length > 1 && stripBullet(first.str + ' x') === 'x') l.x = its[1].x;
          else if (first && first.str.length) {
            const glyph = first.str.length - first.str.replace(BULLET_RE, '').length;
            l.x = first.x + (first.w * glyph) / first.str.length;
          }
        }
        lines.push(l);
      }
      prev = row;
    }
  }

  if (totalChars < 20) {
    throw new Error("This PDF has no readable text. It's probably a scanned image, so it can't be read automatically. Try the Word version of your resume, or fill in the form by hand.");
  }
  return { lines, twoColumn };
}

let pdfjsPromise: Promise<any> | null = null;
async function loadPdfjs() {
  pdfjsPromise ??= (async () => {
    const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  })();
  return pdfjsPromise;
}

export async function extractFile(file: File): Promise<Extracted> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return extractPdf(await file.arrayBuffer(), await loadPdfjs());
  if (name.endsWith('.docx')) return extractDocx(await file.arrayBuffer());
  if (name.endsWith('.doc')) throw new Error('Old .doc files can\'t be read. Open it in Word or Google Docs and save it as .docx or PDF, then upload that.');
  if (name.endsWith('.txt') || file.type.startsWith('text/')) return extractText(await file.text());
  throw new Error('Upload a PDF, Word (.docx) or text file.');
}
