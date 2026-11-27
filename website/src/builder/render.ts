// Turns a RenderCV `cv:` object into the Typst source RenderCV itself would
// generate for the `engineeringresumes` theme with this repo's design settings
// (see example_CV.yaml). The output imports @preview/rendercv, exactly like
// `rendercv render`, so the browser and CI produce the same PDF.
//
// Ports the relevant parts of rendercv/renderer/templater/*:
// entry_templates_from_input.py, string_processor.py, date.py, connections.py.

import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { markdownToTypst } from './markdown';

export const RENDERCV_TYPST_VERSION = '0.3.0'; // bundled with RenderCV 2.8

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

// design.templates for engineeringresumes, plus RenderCV defaults it doesn't override
const TEMPLATES = {
  experience: { main_column: '**POSITION**, COMPANY -- LOCATION\nSUMMARY\nHIGHLIGHTS', date_and_location_column: 'DATE' },
  education: { main_column: '**INSTITUTION**, DEGREE_WITH_AREA -- LOCATION\nSUMMARY\nHIGHLIGHTS', date_and_location_column: 'DATE' },
  normal: { main_column: '**NAME** -- **LOCATION**\nSUMMARY\nHIGHLIGHTS', date_and_location_column: 'DATE' },
  one_line: { main_column: '**LABEL:** DETAILS' },
} as const;
const PHRASES: Record<string, string> = { DEGREE_WITH_AREA: 'DEGREE in AREA' };
const DATE_RANGE = 'START_DATE – END_DATE';

export type CvEntry = string | Record<string, any>;
export interface Cv {
  name?: string;
  headline?: string;
  location?: string;
  email?: string | string[];
  phone?: string | string[];
  website?: string | string[];
  social_networks?: { network: string; username: string }[];
  custom_connections?: { placeholder: string; url?: string | null; fontawesome_icon?: string }[];
  sections?: Record<string, CvEntry[]>;
  [k: string]: any;
}

// ---------- strings ----------

const UPPER_WORD = /\b[A-Z_]+\b/g;
const isPlaceholder = (t: string) => /^[A-Z_]+$/.test(t) && /\b[A-Z_]+\b/.test(t);
const CONNECTOR_WORD = /(?<=\s)(?![A-Z])\p{L}\S*(?=\s)/gu;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function substitute(template: string, fields: Record<string, string>): string {
  const keys = Object.keys(fields).sort((a, b) => b.length - a.length);
  if (!keys.length) return template;
  const re = new RegExp('(' + keys.map(escapeRe).join('|') + ')', 'g');
  return template.replace(re, (m) => fields[m]).trim();
}

export function cleanUrl(url: string): string {
  let u = url.replace('https://', '').replace('http://', '');
  if (u.endsWith('/')) u = u.slice(0, -1);
  return u;
}

function removeConnectors(template: string, missing: Set<string>): string {
  const tokens = template.split(/(\b[A-Z_]+\b)/);
  const ph = (t: string) => isPlaceholder(t);
  return tokens
    .map((tok, i) => {
      if (ph(tok)) return tok;
      let prev: string | undefined;
      for (let j = i - 1; j >= 0; j--) if (ph(tokens[j])) { prev = tokens[j]; break; }
      let next: string | undefined;
      for (let j = i + 1; j < tokens.length; j++) if (ph(tokens[j])) { next = tokens[j]; break; }
      if (prev && next && (missing.has(prev) || missing.has(next))) return tok.replace(CONNECTOR_WORD, '');
      return tok;
    })
    .join('');
}

function cleanTrailing(text: string): string {
  return text
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l !== '')
    .map((l) => l.replace(/[^A-Za-z0-9.!?\[\]()*_%]+$/, '').trimEnd())
    .join('\n');
}

function removeMissing(templates: Record<string, string>, fields: Record<string, string>) {
  const used = new Set(Object.values(templates).join(' ').match(UPPER_WORD) ?? []);
  const missing = new Set([...used].filter((p) => !(p in fields)));
  if (!missing.size) return templates;
  const out: Record<string, string> = {};
  const re = new RegExp('\\S*(?:' + [...missing].map(escapeRe).join('|') + ')\\S*', 'g');
  for (const [k, v] of Object.entries(templates)) {
    const noConnectors = removeConnectors(v, missing).replace(/ {2,}/g, ' ');
    out[k] = cleanTrailing(noConnectors.replace(re, '').replace(/ {2,}/g, ' '));
  }
  return out;
}

// ---------- dates ----------

function dateObject(d: string): [number, number] | null {
  let m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(d);
  if (m) return [+m[1], +m[2]];
  m = /^(\d{4})$/.exec(d);
  if (m) return [+m[1], 1];
  return null;
}

function formatSingleDate(d: string | number): string {
  if (typeof d === 'number') return String(d);
  if (d === 'present') return 'present';
  const o = dateObject(String(d));
  return o ? `${MONTHS[o[1] - 1]} ${o[0]}` : String(d);
}

function formatRangeSide(d: string | number): string {
  if (typeof d === 'number') return String(d);
  if (d === 'present') return 'present';
  return formatSingleDate(d);
}

/** RenderCV's check_and_adjust_dates: returns the normalised {date,start,end}. */
export function normaliseDates(e: Record<string, any>) {
  let { date, start_date: start, end_date: end } = e;
  const has = (v: any) => v !== undefined && v !== null && v !== '';
  if (has(date)) {
    start = end = undefined;
  } else if (!has(start) && has(end)) {
    date = end;
    start = end = undefined;
  } else if (has(start) && !has(end)) {
    end = 'present';
  }
  return { date: has(date) ? date : undefined, start: has(start) ? start : undefined, end: has(end) ? end : undefined };
}

export function dateOrder(start: any, end: any): boolean {
  if (start === undefined || end === undefined || end === 'present') return true;
  const a = dateObject(String(start));
  const b = dateObject(String(end));
  if (!a || !b) return true;
  return a[0] * 12 + a[1] <= b[0] * 12 + b[1];
}

// ---------- entries ----------

type EntryKind = 'text' | 'bullet' | 'one_line' | 'experience' | 'education' | 'normal';

export function entryKind(e: CvEntry): EntryKind | null {
  if (typeof e === 'string') return 'text';
  if ('bullet' in e) return 'bullet';
  if ('label' in e && 'details' in e) return 'one_line';
  if ('company' in e && 'position' in e) return 'experience';
  if ('institution' in e && 'area' in e) return 'education';
  if ('name' in e) return 'normal';
  return null;
}

function renderEntryTemplates(kind: keyof typeof TEMPLATES, raw: Record<string, any>) {
  const e = { ...raw };
  if (kind !== 'one_line') {
    const { date, start, end } = normaliseDates(e);
    e.date = date;
    e.start_date = start;
    e.end_date = end;
  }

  let templates: Record<string, string> = { ...TEMPLATES[kind] };
  for (const [ph, txt] of Object.entries(PHRASES)) {
    for (const k of Object.keys(templates)) templates[k] = templates[k].replaceAll(ph, txt);
  }

  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(e)) {
    if (v === undefined || v === null || v === '') continue;
    fields[k.toUpperCase()] = Array.isArray(v) ? v.join(', ') : String(v);
  }

  if (fields.HIGHLIGHTS && Array.isArray(e.highlights)) {
    fields.HIGHLIGHTS = e.highlights.map((h: string) => '- ' + String(h).replaceAll(' - ', '\n  - ')).join('\n');
  }
  if (fields.DATE || fields.START_DATE || fields.END_DATE) {
    if (e.date !== undefined && !(e.start_date || e.end_date)) fields.DATE = formatSingleDate(e.date);
    else if (e.start_date !== undefined && e.end_date !== undefined)
      fields.DATE = substitute(DATE_RANGE, { START_DATE: formatRangeSide(e.start_date), END_DATE: formatRangeSide(e.end_date) });
    if (e.start_date !== undefined) fields.START_DATE = formatSingleDate(e.start_date);
    if (e.end_date !== undefined) fields.END_DATE = formatSingleDate(e.end_date);
  }
  if (fields.URL) fields.URL = `[${cleanUrl(fields.URL)}](${fields.URL})`;
  if (fields.SUMMARY) {
    const standalone = Object.values(templates).some((t) => t.split('\n').some((l) => l.trim() === 'SUMMARY'));
    if (standalone) {
      const indented = fields.SUMMARY.split('\n').map((l) => (l.trim() ? '    ' + l : l)).join('\n');
      fields.SUMMARY = `!!! summary\n${indented}`;
    }
  }

  templates = removeMissing(templates, fields);
  const result: Record<string, string> = {};
  for (const [k, t] of Object.entries(templates)) result[k] = markdownToTypst(substitute(t, fields));
  return result;
}

function columnEntry(fn: 'regular-entry' | 'education-entry', main: string, dateCol: string): string {
  const mainLines = main ? main.split('\n') : [];
  const dateLines = dateCol ? dateCol.split('\n') : [];
  const firstRow = Math.max(dateLines.length, 1);
  const block = (ls: string[]) => ls.map((l) => `    ${l}\n\n`).join('');
  return (
    `#${fn}(\n` +
    `  [\n${block(mainLines.slice(0, firstRow))}  ],\n` +
    `  [\n${block(dateLines)}  ],\n` +
    `  main-column-second-row: [\n${block(mainLines.slice(firstRow))}  ],\n` +
    `)`
  );
}

export function renderEntry(e: CvEntry): string | null {
  const kind = entryKind(e);
  if (kind === null) return null;
  if (kind === 'text') return markdownToTypst(e as string);
  const obj = e as Record<string, any>;
  if (kind === 'bullet') return `- ${markdownToTypst(String(obj.bullet))}`;
  if (kind === 'one_line') return renderEntryTemplates('one_line', obj).main_column;
  const t = renderEntryTemplates(kind, obj);
  return columnEntry(kind === 'education' ? 'education-entry' : 'regular-entry', t.main_column, t.date_and_location_column);
}

// ---------- header ----------

const SMALL_WORDS = new Set('a and as at but by for from if in into like near nor of off on onto or over so than that to upon when with yet'.split(' '));

export function sectionTitle(key: string): string {
  if (key.includes(' ') || /[A-Z]/.test(key)) return key;
  return key
    .replaceAll('_', ' ')
    .split(' ')
    .map((w) => (SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

const SOCIAL_URLS: Record<string, string> = {
  LinkedIn: 'https://linkedin.com/in/',
  GitHub: 'https://github.com/',
  GitLab: 'https://gitlab.com/',
  Instagram: 'https://instagram.com/',
  ORCID: 'https://orcid.org/',
  StackOverflow: 'https://stackoverflow.com/users/',
  ResearchGate: 'https://researchgate.net/profile/',
  YouTube: 'https://youtube.com/@',
  'Google Scholar': 'https://scholar.google.com/citations?user=',
  Telegram: 'https://t.me/',
  WhatsApp: 'https://wa.me/',
  Leetcode: 'https://leetcode.com/u/',
  X: 'https://x.com/',
  Bluesky: 'https://bsky.app/profile/',
  Reddit: 'https://reddit.com/user/',
  IMDB: 'https://imdb.com/name/',
};

const asList = <T,>(v: T | T[] | undefined): T[] => (v === undefined || v === null || v === ('' as any) ? [] : Array.isArray(v) ? v : [v]);

/** pydantic's HttpUrl adds a trailing slash to bare domains. */
export function normaliseUrl(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    const p = new URL(u);
    return p.pathname === '/' && !p.search && !p.hash ? `${p.protocol}//${p.host}/` : u;
  } catch {
    return u;
  }
}

export function formatPhone(phone: string): { body: string; url: string } {
  const p = parsePhoneNumberFromString(phone);
  if (!p) return { body: phone, url: `tel:${phone.replace(/\s+/g, '')}` };
  // phonenumbers' RFC3966 output: tel:+CC-AAA-BBB (groups from the international format)
  const groups = p.formatInternational().replace(/^\+\d+\s?/, '').split(/[\s-]+/);
  return { body: p.formatNational(), url: `tel:+${p.countryCallingCode}-${groups.join('-')}` };
}

function connections(cv: Cv): string[] {
  const conns: { url: string | null; body: string }[] = [];
  for (const key of Object.keys(cv)) {
    switch (key) {
      case 'email':
        for (const e of asList(cv.email)) conns.push({ url: `mailto:${e}`, body: String(e) });
        break;
      case 'phone':
        for (const p of asList(cv.phone)) {
          const f = formatPhone(String(p));
          conns.push({ url: f.url, body: f.body });
        }
        break;
      case 'website':
        for (const w of asList(cv.website)) {
          const url = normaliseUrl(String(w));
          conns.push({ url, body: cleanUrl(url) });
        }
        break;
      case 'location':
        if (cv.location) conns.push({ url: null, body: String(cv.location) });
        break;
      case 'social_networks':
        for (const s of cv.social_networks ?? []) {
          const url = (SOCIAL_URLS[s.network] ?? '') + s.username;
          conns.push({ url, body: cleanUrl(url) });
        }
        break;
      case 'custom_connections':
        for (const c of cv.custom_connections ?? []) conns.push({ url: c.url ? String(c.url) : null, body: c.placeholder });
        break;
    }
  }
  return conns.map((c) => {
    const body = markdownToTypst(c.body);
    return c.url ? `#link("${c.url}", icon: false, if-underline: false, if-color: false)[${body}]` : body;
  });
}

// ---------- document ----------

const typstString = (s: string) => '"' + s.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"';

function preamble(cv: Cv, today: Date): string {
  const plainName = cv.name ?? '';
  const name = markdownToTypst(plainName);
  const stamp = `${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
  return `// Import the rendercv function and all the refactored components
#import "@preview/rendercv:${RENDERCV_TYPST_VERSION}": *

// Apply the rendercv template with custom configuration
#show: rendercv.with(
  name: ${typstString(plainName)},
  title: ${typstString(`${plainName} - CV`)},
  footer: context { [#emph[${name} -- #str(here().page())\\/#str(counter(page).final().first())]] },
  top-note: [ #emph[Last updated on ${stamp}] ],
  locale-catalog-language: "en",
  text-direction: ltr,
  page-size: "us-letter",
  page-top-margin: 0.7in,
  page-bottom-margin: 0.7in,
  page-left-margin: 0.7in,
  page-right-margin: 0.7in,
  page-show-footer: false,
  page-show-top-note: true,
  colors-body: rgb(0, 0, 0),
  colors-name: rgb(0, 0, 0),
  colors-headline: rgb(0, 0, 0),
  colors-connections: rgb(0, 0, 0),
  colors-section-titles: rgb(0, 0, 0),
  colors-links: rgb(0, 0, 0),
  colors-footer: rgb(128, 128, 128),
  colors-top-note: rgb(128, 128, 128),
  typography-line-spacing: 0.4em,
  typography-alignment: "justified",
  typography-date-and-location-column-alignment: right,
  typography-font-family-body: "XCharter",
  typography-font-family-name: "XCharter",
  typography-font-family-headline: "XCharter",
  typography-font-family-connections: "XCharter",
  typography-font-family-section-titles: "XCharter",
  typography-font-size-body: 10pt,
  typography-font-size-name: 25pt,
  typography-font-size-headline: 10pt,
  typography-font-size-connections: 10pt,
  typography-font-size-section-titles: 1.2em,
  typography-small-caps-name: false,
  typography-small-caps-headline: false,
  typography-small-caps-connections: false,
  typography-small-caps-section-titles: false,
  typography-bold-name: false,
  typography-bold-headline: false,
  typography-bold-connections: false,
  typography-bold-section-titles: true,
  links-underline: true,
  links-show-external-link-icon: false,
  header-alignment: center,
  header-photo-width: 3.5cm,
  header-space-below-name: 0.7cm,
  header-space-below-headline: 0.7cm,
  header-space-below-connections: 0.7cm,
  header-connections-hyperlink: true,
  header-connections-show-icons: false,
  header-connections-display-urls-instead-of-usernames: true,
  header-connections-separator: "|",
  header-connections-space-between-connections: 0.5cm,
  section-titles-type: "with_full_line",
  section-titles-line-thickness: 0.5pt,
  section-titles-space-above: 0.5cm,
  section-titles-space-below: 0.3cm,
  sections-allow-page-break: true,
  sections-space-between-text-based-entries: 0.15cm,
  sections-space-between-regular-entries: 0.42cm,
  entries-date-and-location-width: 4.15cm,
  entries-side-space: 0cm,
  entries-space-between-columns: 0.1cm,
  entries-allow-page-break: false,
  entries-short-second-row: false,
  entries-degree-width: 1cm,
  entries-summary-space-left: 0cm,
  entries-summary-space-above: 0.08cm,
  entries-highlights-bullet:  text(13pt, [•], baseline: -0.6pt) ,
  entries-highlights-nested-bullet:  text(13pt, [•], baseline: -0.6pt) ,
  entries-highlights-space-left: 0cm,
  entries-highlights-space-above: 0.08cm,
  entries-highlights-space-between-items: 0.08cm,
  entries-highlights-space-between-bullet-and-text: 0.3em,
  date: datetime(
    year: ${today.getFullYear()},
    month: ${today.getMonth() + 1},
    day: ${today.getDate()},
  ),
)

`;
}

export function renderTypst(cv: Cv, today = new Date()): string {
  let out = preamble(cv, today) + '\n';
  if (cv.name) out += `= ${markdownToTypst(cv.name)}\n\n`;
  if (cv.headline) out += `  #headline([${markdownToTypst(cv.headline)}])\n\n`;
  out += `#connections(\n${connections(cv).map((c) => `  [${c}],\n`).join('')})\n\n\n`;

  for (const [key, entries] of Object.entries(cv.sections ?? {})) {
    const rendered = (entries ?? []).map(renderEntry).filter((x): x is string => x !== null);
    if (!rendered.length) continue;
    out += `== ${markdownToTypst(sectionTitle(key))}\n\n${rendered.join('\n\n')}\n\n`;
  }
  return out;
}
