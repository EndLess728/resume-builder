// Reads the lines of an old resume and fills the builder's form.
//
// It's heuristic: it looks for section headings ("Experience", "EDUCATION",
// "Technical Skills"…), contact details by pattern, and dates in the usual
// formats, then splits each entry into title / company / location using a few
// clues (job-title words, school words, place names, " at ", separators).
// Anything it can't place goes into an "Other" section, so nothing is lost and
// the user can tidy up.

import type { Extracted, Line } from './extract';
import { uid, type EducationItem, type ExperienceItem, type Header, type ProjectItem, type Resume, type Section, type SkillItem } from '../model';

export interface ParseResult {
  resume: Resume;
  found: string[];
  warnings: string[];
}

type Kind = 'header' | 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'list' | 'skip';

// ---------- vocabulary ----------

const HEADING_WORDS: [Kind, RegExp][] = [
  ['contact', /^(contact|contacts|contact (info|information|details|me)|personal (details|information|info|profile|data))$/],
  ['skip', /^(declaration|references?|references available( on request)?)$/],
  ['projects', /\bprojects?\b|^portfolio$|^open source( contributions| work)?$/],
  ['education', /\beducation\b|\bacademics?\b|\bacademic (background|qualifications?|profile|details)\b|^(educational )?qualifications?$|^schooling$/],
  ['experience', /\b(experience|employment|work history|career history|internships?|professional background|work)\b/],
  ['skills', /\bskills?\b|\bcompetenc(y|ies)\b|\bexpertise\b|^(technologies|tools|tech stack|tools (and|&) technologies|technical proficiency|proficiencies|toolbox)$/],
  ['summary', /\b(summary|objective)\b|^((professional|career|personal) )?(profile|overview|introduction|statement|bio)$|^about( me)?$/],
  ['list', /\b(certifications?|certificates?|licen[cs]es?|awards?|achievements?|honou?rs|accomplishments|languages|interests|hobbies|publications|volunteer(ing)?|activities|extra[- ]?curricular|trainings?|courses?|coursework|memberships?|affiliations|strengths|leadership|patents|conferences|talks)\b/],
];

const JOB_WORDS =
  /\b(engineer|developer|programmer|manager|intern|internship|trainee|apprentice|analyst|consultant|designer|tester|qa|sdet|lead|head|director|officer|executive|specialist|associate|assistant|architect|administrator|admin|coordinator|representative|scientist|researcher|teacher|lecturer|professor|accountant|founder|co-founder|cofounder|ceo|cto|cfo|coo|owner|freelancer?|president|vp|supervisor|technician|operator|writer|editor|marketer|sde|devops|sre|staff|principal|partner|advisor|adviser|mentor|tutor|nurse|doctor|physician|pharmacist|clerk|cashier|agent|recruiter|hr|sales|counsel|attorney|lawyer|auditor|strategist|planner|producer|photographer|artist|chef|instructor|trainer|volunteer|member|contributor|maintainer|fellow|ambassador|team leader)\b/i;

const SCHOOL_WORDS = /\b(university|universities|universiteit|colleges?|institutes?|institution|schools?|academy|polytechnic|vidyalaya|vidyapeeth|iit|nit|iiit|bits|campus|faculty|conservatory|seminary|mahavidyalaya)\b/i;

const DEGREE_RE =
  /^(?:(b\.?\s?tech|m\.?\s?tech|b\.?\s?e\.?|m\.?\s?e\.?|b\.?\s?sc\.?|m\.?\s?sc\.?|b\.?\s?a\.?|m\.?\s?a\.?|b\.?\s?com\.?|m\.?\s?com\.?|bca|mca|bba|mba|pgdm|pgdca|ph\.?\s?d\.?|d\.?\s?phil|m\.?\s?phil|ll\.?\s?b|ll\.?\s?m|m\.?b\.?b\.?s|b\.?\s?pharm|m\.?\s?pharm|b\.?\s?ed|m\.?\s?ed|b\.?\s?arch|b\.?\s?des|m\.?\s?des|bs|ms|ba|ma|bsc|msc|beng|meng|a\.?a\.?|a\.?s\.?|diploma|bachelor'?s?|master'?s?|doctorate|associate'?s?|certificate|high school|secondary|senior secondary|higher secondary|matriculation|intermediate|hsc|ssc|cbse|icse|a[- ]levels?|gcse|10th|12th|class (x|xii|10|12))\b\.?)/i;

const COMPANY_SUFFIX = /\b(ltd|limited|inc|llc|llp|pvt|private|corp|corporation|co|company|gmbh|plc|technologies|technology|solutions|systems|labs|studio|studios|group|services|software|consulting|consultancy|bank|agency|ventures|industries|global|international|enterprises)\.?\b/i;

const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
const TOK = `(?:${MONTH}[\\s,']*(?:(?:19|20)\\d{2}|'\\d{2})|(?:0?[1-9]|1[0-2])[/.-](?:19|20)\\d{2}|(?:19|20)\\d{2}(?:[/.-](?:0?[1-9]|1[0-2]))?(?![/.-]?\\d))`;
const PRESENT = '(?:present|current(?:ly)?|now|till\\s+(?:date|now)|to\\s+date|ongoing|today|continuing)';
const RANGE_RE = new RegExp(`(?<![\\w/])(${TOK})\\s*(?:–|—|-|−|to|until|till|~|→)\\s*(${TOK}|${PRESENT})(?![\\w])`, 'i');
const SINGLE_RE = new RegExp(`(?<![\\w/.-])(${TOK}|${PRESENT})(?![\\w/])`, 'i');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE_RE = /(?:\+?\(?\d[\d\s().-]{7,}\d)/;
const URL_RE = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/\S*)?$/i;
const LABEL_RE = /^(e-?mail|email id|mail|phone|ph|mobile|mob|cell|tel|telephone|contact( no\.?)?|linkedin|github|git|website|web|portfolio|blog|address|location|city|residence|current location|skype)\s*(?:no\.?)?\s*[:\-–]\s*/i;
const SEP_RE = /\s*[|•·●◦▪⋅∙⦁\t]\s*|\s{3,}|\s+[-–—]\s+/;

// ---------- helpers ----------

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const isAllCaps = (s: string) => /[A-Z]/.test(s) && s === s.toUpperCase() && !/[a-z]/.test(s);
const trimPunct = (s: string) => s.replace(/^[\s|•·,;:–—\-()/]+|[\s|•·,;:–—\-(/]+$/g, '').replace(/^\((.*)\)$/, '$1').trim();
const unique = <T,>(xs: T[]) => [...new Set(xs)];

export function titleCase(s: string): string {
  if (!isAllCaps(s)) return s;
  return s.toLowerCase().replace(/(^|[\s\-'(])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()).replace(/\b(And|Of|In|At|For|The|To|With)\b/g, (w, _1, i) => (i === 0 ? w : w.toLowerCase()));
}

function parseDateToken(tok: string): string {
  const t = tok.trim().toLowerCase();
  if (new RegExp(`^${PRESENT}$`, 'i').test(t)) return 'present';
  let m = new RegExp(`^(${MONTH})[\\s,']*((?:19|20)\\d{2}|'\\d{2})$`, 'i').exec(t);
  if (m) {
    const mon = MONTHS.indexOf(m[1].slice(0, 3)) + 1;
    let year = m[2].replace("'", '');
    if (year.length === 2) year = (+year > (new Date().getFullYear() % 100) + 5 ? '19' : '20') + year;
    return `${year}-${String(mon).padStart(2, '0')}`;
  }
  m = /^(\d{1,2})[/.-](\d{4})$/.exec(t);
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  m = /^(\d{4})[/.-](\d{1,2})$/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  m = /^(\d{4})$/.exec(t);
  if (m) return m[1];
  return tok.trim();
}

export function findDates(text: string): { start: string; end: string; rest: string } | null {
  let m = RANGE_RE.exec(text);
  if (m) return { start: parseDateToken(m[1]), end: parseDateToken(m[2]), rest: text.replace(m[0], ' ') };
  m = SINGLE_RE.exec(text);
  if (m) {
    const d = parseDateToken(m[1]);
    // "Expected 2026" / "Graduated May 2019" etc.
    const rest = text.replace(m[0], ' ').replace(/\b(expected|graduated|graduation|completed|passed|since|from|class of)\b[:\s]*/i, ' ');
    return d === 'present' ? null : { start: '', end: d, rest };
  }
  return null;
}

/** Splits "a | b · c — d" into pieces; keeps commas. */
const pieces = (s: string) => s.split(SEP_RE).map(trimPunct).filter((p) => p && /[\p{L}\p{N}]/u.test(p));

function isPlace(s: string): boolean {
  const t = s.trim();
  if (/^(remote|hybrid|on-?site|work from home|wfh)$/i.test(t)) return true;
  if (!t || /\d/.test(t) || JOB_WORDS.test(t) || SCHOOL_WORDS.test(t) || COMPANY_SUFFIX.test(t)) return false;
  const parts = t.split(/\s*,\s*/);
  return parts.length <= 3 && parts.every((p) => words(p).length <= 3 && /^[\p{Lu}][\p{L}.'’ -]*$/u.test(p));
}

/** "Sector 70, Mohali, Punjab" → "Mohali, Punjab" */
function placeTail(t: string): string {
  const parts = t.split(/\s*,\s*/);
  const tail: string[] = [];
  for (let i = parts.length - 1; i >= 0 && tail.length < 2 && isPlace(parts[i]); i--) tail.unshift(parts[i]);
  return tail.join(', ');
}

// ---------- headings ----------

function headingKind(line: Line, bodySize: number, afterFirstHeading: boolean): Kind | null {
  if (line.bullet || line.text.includes('\t')) return null;
  const t = line.text.replace(/[:：]\s*$/, '').trim();
  if (/[:：]\s*\S/.test(t)) return null; // "Languages: Java, SQL" is content, not a heading
  if (t.length > 45 || words(t).length > 6 || /[.!?]$/.test(t) || EMAIL_RE.test(t) || /\d{3}/.test(t)) return null;
  const key = t.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!key) return null;
  const styled = isAllCaps(t) || line.bold || line.size > bodySize * 1.12 || /[:：]\s*$/.test(line.text);
  for (const [kind, re] of HEADING_WORDS) {
    if (!re.test(key)) continue;
    // Plain-looking lines only count as headings when they're short and exact-ish.
    if (!styled && words(key).length > 3) return null;
    if (kind === 'experience' && !styled && !/experience|employment|history|internships?/.test(key)) return null;
    return kind;
  }
  // Unknown headings: short, all caps, styled, once we're past the header.
  if (afterFirstHeading && isAllCaps(t) && words(t).length <= 4 && /^[A-Z &/,'-]+$/.test(t) && (line.bold || line.size >= bodySize || line.gap > 1.5)) return 'list';
  return null;
}

// ---------- line clean-up ----------

const JUNK_RE = /^(page \d+( of \d+)?|\d+\s*\/\s*\d+|curriculum vitae|resume|résumé|cv|last updated( on)?\b.*)$/i;

function mergeWrapped(lines: Line[]): Line[] {
  const out: Line[] = [];
  for (const l of lines) {
    const prev = out[out.length - 1];
    // A wrapped table cell: a lone line sitting under one of the previous row's columns.
    if (prev && !l.bullet && !prev.bullet && prev.segX && prev.segX.length >= 3 && (l.segX?.length ?? 1) === 1 && !findDates(l.text)) {
      const j = prev.segX.findIndex((x) => Math.abs(x - l.x) < 3);
      if (j > 0) {
        const cells = prev.text.split('\t');
        if (cells.length === prev.segX.length) {
          cells[j] = `${cells[j]} ${l.text}`;
          prev.text = cells.join('\t');
          continue;
        }
      }
    }
    if (prev && !l.bullet && prev.bullet) {
      const sameIndent = l.x > 0 && Math.abs(l.x - prev.x) < 2.5 && Math.abs(l.size - prev.size) < 1;
      const lower = /^[a-z(&,]/.test(l.text);
      const noDate = !RANGE_RE.test(l.text);
      if ((sameIndent && noDate && (lower || !/[.;!?]$/.test(prev.text)) && !l.text.includes('\t')) || (lower && l.x === 0)) {
        prev.text = `${prev.text} ${l.text}`.replace(/(\w)- (\w)/, '$1$2');
        prev.links = [...prev.links, ...l.links];
        continue;
      }
    }
    out.push({ ...l, links: [...l.links] });
  }
  return out;
}

// ---------- contact & header ----------

interface Contact extends Header {}

function readContacts(lines: Line[], header: Contact, used: Set<Line>, leftovers: { text: string; line: Line; contactLine: boolean }[]) {
  for (const l of lines) {
    let hadContact = false;
    const left: string[] = [];
    // URLs behind link text ("LinkedIn", "Portfolio") first.
    for (const k of l.links) {
      const u = k.url;
      if (/^mailto:/i.test(u)) header.email ||= u.replace(/^mailto:/i, '').split('?')[0];
      else if (/^tel:/i.test(u)) header.phone ||= k.text && PHONE_RE.test(k.text) && /\+/.test(k.text) ? k.text : u.replace(/^tel:/i, '').replace(/-/g, ' ');
      else if (/linkedin\.com\/in\//i.test(u)) header.linkedin ||= /linkedin\.com\/in\/([^/?#\s]+)/i.exec(u)![1];
      else if (/github\.com\/[^/?#\s]+\/?$/i.test(u)) header.github ||= /github\.com\/([^/?#\s]+)/i.exec(u)![1];
      else continue;
      hadContact = true;
    }
    const queue = pieces(l.text);
    while (queue.length) {
      const raw = queue.shift()!;
      const p = raw.replace(LABEL_RE, '').trim();
      if (!p) continue;
      const again = (rest: string) => {
        const r = trimPunct(rest);
        if (r && /[\p{L}\p{N}]/u.test(r)) queue.unshift(r);
      };
      const linked = l.links.find((k) => k.text && p.includes(k.text) && /linkedin|github|mailto|tel:/i.test(k.url));
      if (linked && words(p).length <= 2) { hadContact = true; continue; }
      const em = EMAIL_RE.exec(p);
      if (em) { header.email ||= em[0]; hadContact = true; again(p.replace(em[0], ' ')); continue; }
      const li = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([^/?#\s]+)\/?/i.exec(p);
      if (li) { header.linkedin ||= li[1]; hadContact = true; again(p.replace(li[0], ' ')); continue; }
      const gh = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)\/?/i.exec(p);
      if (gh) { header.github ||= gh[1]; hadContact = true; again(p.replace(gh[0], ' ')); continue; }
      const ph = PHONE_RE.exec(p);
      const digits = ph ? ph[0].replace(/\D/g, '').length : 0;
      if (ph && digits >= 10 && digits <= 15 && !RANGE_RE.test(ph[0])) {
        header.phone ||= ph[0].trim();
        hadContact = true;
        again(p.replace(ph[0], ' ').replace(/\b(mobile|mob|phone|ph|tel|cell)\b\s*(no\.?)?\s*[:\-]?/i, ' '));
        continue;
      }
      if (URL_RE.test(p) && !/\s/.test(p)) { header.website ||= p; hadContact = true; continue; }
      left.push(raw);
    }
    if (hadContact) used.add(l);
    for (const t of left) leftovers.push({ text: t, line: l, contactLine: hadContact });
  }
}

function readHeader(lines: Line[], contactSections: Line[][], bodySize: number) {
  const header: Contact = { name: '', headline: '', location: '', email: '', phone: '', website: '', linkedin: '', github: '' };
  const usable = lines.filter((l) => !JUNK_RE.test(l.text.trim()));
  // Name: the biggest text near the top that isn't contact info.
  const candidates = usable.slice(0, 4).filter((l) => !EMAIL_RE.test(l.text) && !PHONE_RE.test(l.text) && !l.text.includes('|') && words(l.text).length <= 5 && /^[\p{L} .'’-]+$/u.test(l.text));
  const nameLine = candidates.sort((a, b) => b.size - a.size)[0];
  if (nameLine) header.name = titleCase(nameLine.text.replace(/\s+/g, ' '));

  const rest = usable.filter((l) => l !== nameLine);
  const used = new Set<Line>();
  const leftovers: { text: string; line: Line; contactLine: boolean }[] = [];
  readContacts(rest, header, used, leftovers);
  const contactLeft: { text: string; line: Line; contactLine: boolean }[] = [];
  for (const sec of contactSections) readContacts(sec, header, new Set(), contactLeft);

  const firstContactIdx = rest.findIndex((l) => used.has(l));
  const extra: string[] = [];
  for (const lo of [...leftovers, ...contactLeft.map((c) => ({ ...c, contactLine: true }))]) {
    const t = lo.text.replace(LABEL_RE, '').trim();
    const idx = rest.indexOf(lo.line);
    const nearContacts = lo.contactLine || (firstContactIdx >= 0 && idx > firstContactIdx);
    const addressTail = /^(address|location|city|residence|current location)\b/i.test(lo.text) ? placeTail(t) : '';
    if (!header.location && addressTail) header.location = addressTail;
    else if (!header.location && isPlace(t) && !JOB_WORDS.test(t) && nearContacts) header.location = t;
    else if (!header.headline && words(t).length <= 10 && !nearContacts) header.headline = t;
    else if (!header.headline && words(t).length <= 8 && JOB_WORDS.test(t)) header.headline = t;
    else extra.push(t);
  }
  return { header, extra };
}

// ---------- entries ----------

interface RawEntry {
  head: Line[];
  bullets: string[];
  links: { text: string; url: string }[];
}

const TABLE_HEAD = /^(s\.? ?no\.?|sr\.? ?no\.?|qualification|course|degree|examination|exam|class|standard|institute|institution|school|college|university|board|board ?\/ ?university|year|year of passing|passing year|duration|session|score|marks|percentage|cgpa|gpa|grade|result|company|organization|organisation|designation|role|position|from|to|period|location)$/i;
const isTableHead = (l: Line) => {
  const ps = l.text.split(/\t|\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
  return ps.length >= 2 && ps.every((p) => TABLE_HEAD.test(p.replace(/[%.:]/g, '').trim()));
};

function splitEntries(all: Line[]): RawEntry[] {
  const lines = all.filter((l) => !isTableHead(l));
  const entries: RawEntry[] = [];
  let cur: RawEntry | null = null;
  const hasDate = (e: RawEntry) => e.head.some((l) => findDates(l.text));
  const isDateOnly = (l: Line) => {
    const d = findDates(l.text);
    return !!d && words(trimPunct(d.rest)).length <= 3 && !JOB_WORDS.test(d.rest);
  };
  lines.forEach((l, i) => {
    if (l.bullet) {
      cur ??= { head: [], bullets: [], links: [] };
      cur.bullets.push(l.text);
      cur.links.push(...l.links);
      return;
    }
    const next = lines[i + 1];
    const sentence = !findDates(l.text) && !l.text.includes('\t') && !/[|•·]/.test(l.text) && (/[.!]$/.test(l.text) || words(l.text).length >= 9);
    if (cur && !cur.bullets.length && cur.head.length && sentence) {
      cur.head.push(l);
      return;
    }
    const startNew =
      !cur ||
      cur.bullets.length > 0 ||
      (hasDate(cur) && cur.head.length >= 1 && !isDateOnly(l)) ||
      (cur.head.length >= 2 && !hasDate(cur) && !(next && isDateOnly(next)) && !findDates(l.text));
    if (startNew) {
      cur = { head: [], bullets: [], links: [] };
      entries.push(cur);
    }
    cur!.head.push(l);
    cur!.links.push(...l.links);
  });
  if (cur && !entries.includes(cur)) entries.unshift(cur); // bullets before any header line
  return entries;
}

interface Bits {
  start: string;
  end: string;
  parts: { text: string; fromDateLine: boolean; line: number; idx: number }[];
}

function headBits(head: Line[]): Bits {
  let start = '';
  let end = '';
  const parts: Bits['parts'] = [];
  head.forEach((l, li) => {
    let text = l.text;
    let fromDateLine = false;
    if (!start && !end) {
      const d = findDates(text);
      if (d) {
        start = d.start;
        end = d.end;
        text = d.rest.replace(/\(\s*\)|\[\s*\]/g, ' ');
        fromDateLine = words(trimPunct(text)).length <= 4 && !JOB_WORDS.test(text);
      }
    }
    pieces(text).forEach((p, idx) => parts.push({ text: p, fromDateLine, line: li, idx }));
  });
  return { start, end, parts };
}

/** "Infosys Ltd, Chandigarh" → ["Infosys Ltd", "Chandigarh"]; keeps "London, UK" together at the end. */
function splitCommas(text: string, mayBeAllPlace = false): string[] {
  const subs = text.split(/\s*,\s*/).filter(Boolean);
  if (subs.length === 1) return subs;
  if (mayBeAllPlace && isPlace(text)) return [subs.join(', ')];
  const out: string[] = [];
  let i = subs.length;
  // gather trailing place-like parts into one location
  const tail: string[] = [];
  while (i > 1 && isPlace(subs[i - 1]) && words(subs[i - 1]).length <= 3) {
    if (i - 1 === 1 && JOB_WORDS.test(subs[0])) break; // "Intern, Webtunix AI": keep the company
    tail.unshift(subs[--i]);
  }
  out.push(...subs.slice(0, i));
  if (tail.length) out.push(tail.join(', '));
  // "Senior Engineer, Example Corp": split the job title off the front
  if (out.length === 1 && subs.length > 1) return subs;
  return out;
}

function parseExperience(e: RawEntry): ExperienceItem | null {
  const b = headBits(e.head);
  let position = '';
  let company = '';
  const locations: string[] = [];
  const others: string[] = [];

  for (const line of e.head) {
    const at = /^(.+?)\s+(?:at|@)\s+([^|·•\t,–—]+)/.exec(line.text);
    if (at && JOB_WORDS.test(at[1]) && !position) {
      position = trimPunct(at[1]);
      company = trimPunct(at[2]);
    }
  }

  const flat: Bits['parts'] = [];
  for (const p of b.parts) {
    if (position && company && (p.text.includes(position) || p.text.includes(company))) {
      const leftover = trimPunct(p.text.replace(position, '').replace(company, '').replace(/\s(at|@)\s/, ' '));
      if (leftover) flat.push({ ...p, text: leftover });
      continue;
    }
    for (const s of splitCommas(p.text, p.idx > 0 || p.fromDateLine)) flat.push({ ...p, text: s });
  }

  const rest: typeof flat = [];
  for (const p of flat) {
    if (p.fromDateLine && isPlace(p.text)) locations.push(p.text);
    else if (/^(remote|hybrid|on-?site)$/i.test(p.text)) locations.push(p.text);
    else if (!position && JOB_WORDS.test(p.text) && !COMPANY_SUFFIX.test(p.text)) position = p.text;
    else rest.push(p);
  }
  for (const p of rest) {
    if (!company) company = p.text;
    else if (isPlace(p.text) && !locations.length) locations.push(p.text);
    else others.push(p.text);
  }
  if (!position && others.length) position = others.shift()!;
  // No job words at all: a two-line header is usually company then title.
  if (!position && company && e.head.length >= 2 && rest.length >= 2) {
    position = rest[1].text;
  }

  if (!position && !company && !e.bullets.length) return null;
  return {
    id: uid(),
    position,
    company,
    location: locations.join(', '),
    start: b.start,
    end: b.end,
    summary: others.join(' · '),
    highlights: e.bullets.join('\n'),
  };
}

function splitDegree(text: string): { degree: string; area: string } {
  const t = text.trim();
  let m = /^(.+?)\s+in\s+(.+)$/i.exec(t);
  if (m && DEGREE_RE.test(m[1])) return { degree: m[1].trim(), area: m[2].trim() };
  m = /^(.+?)\s*\(([^)]+)\)$/.exec(t);
  if (m && DEGREE_RE.test(m[1]) && !/^(10|12)th$/i.test(m[2])) return { degree: m[1].trim(), area: m[2].trim() };
  m = DEGREE_RE.exec(t);
  if (m && !/^(bachelor|master|associate|doctorate|diploma|certificate|high school|senior secondary|higher secondary|secondary)/i.test(m[1])) {
    const rest = trimPunct(t.slice(m[0].length).replace(/^\s*(of|in)\s+/i, ''));
    if (rest) return { degree: m[0].trim(), area: rest };
  }
  return { degree: '', area: t };
}

function parseEducation(e: RawEntry): EducationItem | null {
  const b = headBits(e.head);
  let institution = '';
  let degreeText = '';
  const locations: string[] = [];
  const others: string[] = [];
  const flat = b.parts.flatMap((p) => p.text.split(/\s*,\s*/).map((s) => ({ ...p, text: s }))).filter((p) => p.text);
  for (const p of flat) {
    if (/^(cgpa|gpa|percentage|grade|score)\b|%|\b\d(\.\d+)?\s*\/\s*10\b/i.test(p.text)) others.push(p.text);
    else if (!degreeText && DEGREE_RE.test(p.text)) degreeText = p.text;
    else if (!institution && SCHOOL_WORDS.test(p.text)) institution = p.text;
    else if (isPlace(p.text) && (institution || p.fromDateLine)) locations.push(p.text);
    else others.push(p.text);
  }
  if (!institution && others.length) institution = others.shift()!;
  if (!degreeText && others.length) degreeText = others.shift()!;
  if (!institution && !degreeText) return null;
  const { degree, area } = splitDegree(degreeText || '');
  return {
    id: uid(),
    institution,
    degree,
    area,
    location: locations.join(', '),
    start: b.start,
    end: b.end,
    summary: others.join(' · '),
    highlights: e.bullets.join('\n'),
  };
}

function parseProject(e: RawEntry): ProjectItem | null {
  const b = headBits(e.head);
  let url = e.links.find((k) => /^https?:/i.test(k.url) && !/linkedin\.com\/in\//i.test(k.url))?.url ?? '';
  const parts = b.parts.map((p) => p.text);
  const urlPart = parts.find((p) => URL_RE.test(p) && !/\s/.test(p));
  if (urlPart) {
    url ||= urlPart;
    parts.splice(parts.indexOf(urlPart), 1);
  }
  const name = parts.shift() ?? '';
  if (!name && !e.bullets.length) return null;
  const summaryBits = parts.filter((p) => !(b.parts.find((q) => q.text === p)?.fromDateLine && isPlace(p)));
  return {
    id: uid(),
    name,
    url,
    location: '',
    start: b.start,
    end: b.end,
    summary: summaryBits.join(' · '),
    highlights: e.bullets.join('\n'),
  };
}

function parseSkills(lines: Line[]): SkillItem[] {
  const rows: SkillItem[] = [];
  const loose: string[] = [];
  for (const l of lines) {
    const m = /^([^:]{2,40}):\s*(.+)$/.exec(l.text);
    if (m && words(m[1]).length <= 5) rows.push({ id: uid(), label: m[1].trim(), details: m[2].trim() });
    else loose.push(...l.text.split(/\t|\s*[|•·]\s*/).map(trimPunct).filter(Boolean));
  }
  if (loose.length) rows.push({ id: uid(), label: rows.length ? 'Other' : 'Skills', details: loose.join(', ') });
  return rows;
}

// ---------- main ----------

export function parseResume(ex: Extracted): ParseResult {
  const warnings: string[] = [];
  const lines = mergeWrapped(ex.lines.filter((l) => !JUNK_RE.test(l.text.trim())));
  const sizes = lines.filter((l) => !l.bullet).map((l) => l.size).sort((a, b) => a - b);
  const bodySize = sizes[Math.floor(sizes.length / 2)] ?? 11;

  // Cut into blocks at headings.
  type Block = { kind: Kind; title: string; lines: Line[] };
  const blocks: Block[] = [{ kind: 'header', title: '', lines: [] }];
  let seenHeading = false;
  for (const l of lines) {
    const kind = headingKind(l, bodySize, seenHeading);
    if (kind) {
      seenHeading = true;
      blocks.push({ kind, title: titleCase(l.text.replace(/[:：]\s*$/, '').trim()), lines: [] });
    } else blocks[blocks.length - 1].lines.push(l);
  }

  const PERSONAL = /^(father'?s?|mother'?s?|husband'?s?|spouse|guardian|d\.?o\.?b|date of birth|birth ?date|age|gender|sex|marital|nationality|religion|caste|category|passport|aadhaa?r|pan( card)?|blood group|height|weight|place|date)\b/i;
  let droppedPersonal = 0;
  const knownLanguages: string[] = [];
  const contactBlocks = blocks.filter((b) => b.kind === 'contact').map((b) =>
    b.lines.filter((l) => {
      const lang = /^languages?( known| spoken)?\s*[:\-–]\s*(.+)$/i.exec(l.text);
      if (lang) { knownLanguages.push(lang[2].trim()); return false; }
      if (PERSONAL.test(l.text)) { droppedPersonal++; return false; }
      return true;
    }),
  );
  const { header, extra } = readHeader(blocks[0].lines, contactBlocks, bodySize);

  const sections: Section[] = [];
  const found: string[] = [];
  const titles = new Set<string>();
  const title = (t: string) => {
    let out = t || 'Other';
    for (let n = 2; titles.has(out); n++) out = `${t} ${n}`;
    titles.add(out);
    return out;
  };

  // A paragraph under the name without a heading is usually a summary.
  const longExtra = extra.filter((t) => words(t).length > 8);
  const shortExtra = extra.filter((t) => words(t).length <= 8);
  if (longExtra.length && !blocks.some((b) => b.kind === 'summary')) {
    sections.push({ id: uid(), title: title('Summary'), kind: 'text', text: longExtra.join(' ') });
    found.push('summary');
  } else shortExtra.push(...longExtra);

  for (const blk of blocks.slice(1)) {
    if (!blk.lines.length) continue;
    switch (blk.kind) {
      case 'contact':
        break;
      case 'skip':
        warnings.push(`Left out "${blk.title}". Modern resumes don't need it.`);
        break;
      case 'summary': {
        const text = blk.lines.map((l) => l.text.replace(/\t/g, ' ')).join(' ').replace(/\s+/g, ' ').trim();
        sections.push({ id: uid(), title: title(blk.title), kind: 'text', text });
        found.push('summary');
        break;
      }
      case 'skills': {
        const items = parseSkills(blk.lines);
        if (items.length) {
          sections.push({ id: uid(), title: title(blk.title), kind: 'skills', items });
          found.push('skills');
        }
        break;
      }
      case 'experience': {
        const items = splitEntries(blk.lines).map(parseExperience).filter((x): x is ExperienceItem => !!x);
        if (items.length) {
          sections.push({ id: uid(), title: title(blk.title), kind: 'experience', items });
          found.push(`${items.length} job${items.length > 1 ? 's' : ''}`);
        }
        break;
      }
      case 'education': {
        const items = splitEntries(blk.lines).map(parseEducation).filter((x): x is EducationItem => !!x);
        if (items.length) {
          sections.push({ id: uid(), title: title(blk.title), kind: 'education', items });
          found.push(`${items.length} education entr${items.length > 1 ? 'ies' : 'y'}`);
        }
        break;
      }
      case 'projects': {
        const items = splitEntries(blk.lines).map(parseProject).filter((x): x is ProjectItem => !!x);
        if (items.length) {
          sections.push({ id: uid(), title: title(blk.title), kind: 'projects', items });
          found.push(`${items.length} project${items.length > 1 ? 's' : ''}`);
        }
        break;
      }
      default: {
        const items = blk.lines.map((l) => l.text.replace(/\t/g, ' · '));
        const asText = !blk.lines.some((l) => l.bullet) && items.length <= 2 && items.join(' ').length > 160;
        sections.push(asText
          ? { id: uid(), title: title(blk.title), kind: 'text', text: items.join(' ') }
          : { id: uid(), title: title(blk.title), kind: 'bullets', text: items.join('\n') });
        found.push(blk.title.toLowerCase());
      }
    }
  }

  if (knownLanguages.length && !sections.some((x) => /^languages?$/i.test(x.title))) {
    sections.push({ id: uid(), title: title('Languages'), kind: 'bullets', text: knownLanguages.join('\n') });
    found.push('languages');
  }
  if (droppedPersonal) warnings.push(`Left out ${droppedPersonal} personal detail${droppedPersonal > 1 ? 's' : ''} (date of birth, parents' names and so on). Resumes don't need them, and it's safer without.`);

  if (shortExtra.length) {
    sections.push({ id: uid(), title: title('Other (from your old resume)'), kind: 'bullets', text: unique(shortExtra).join('\n') });
    warnings.push('Some lines near the top didn\'t fit anywhere. They\'re in "Other (from your old resume)" at the bottom: move or delete them.');
  }

  // Two-column layouts read sidebar-first; put sections back in the usual order.
  if (ex.twoColumn) {
    const order = ['text', 'experience', 'projects', 'education', 'skills', 'bullets'];
    sections.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  }

  if (!header.name) warnings.push("Couldn't find your name. Add it under Your details.");
  if (header.phone && !header.phone.trim().startsWith('+')) warnings.push('Add your country code to the phone number (e.g. +91), or the GitHub workflow will reject it.');
  if (!sections.some((s) => s.kind === 'experience' || s.kind === 'education')) warnings.push("Couldn't find work experience or education headings. Check the sections below.");

  const contactFound = (['email', 'phone', 'linkedin', 'github', 'website', 'location'] as const).filter((k) => header[k]);
  const count = (kind: Section['kind']) => sections.reduce((n, x) => n + (x.kind === kind && 'items' in x ? x.items.length : 0), 0);
  const plural = (n: number, one: string, many: string) => (n ? [`${n} ${n === 1 ? one : many}`] : []);
  const summary = [
    ...(header.name ? ['name'] : []),
    ...contactFound,
    ...unique(found.filter((f) => !/^\d/.test(f))),
    ...plural(count('experience'), 'job', 'jobs'),
    ...plural(count('education'), 'education entry', 'education entries'),
    ...plural(count('projects'), 'project', 'projects'),
  ];
  return { resume: { version: 1, header, sections }, found: summary, warnings };
}
