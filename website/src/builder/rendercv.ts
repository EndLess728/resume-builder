// Converts between the builder's form state and RenderCV YAML.
// The exported file is a complete RenderCV input with the same design, locale
// and settings as example_CV.yaml, so it drops straight into a resume repo.

import YAML from 'yaml';
import type { Cv, CvEntry } from './render';
import { entryKind, normaliseUrl, sectionTitle } from './render';
import {
  lines,
  missingFields,
  newSection,
  paragraphs,
  uid,
  type DateValue,
  type Resume,
  type Section,
} from './model';

const SCHEMA_COMMENT =
  '# yaml-language-server: $schema=https://raw.githubusercontent.com/rendercv/rendercv/refs/tags/v2.6/schema.json\n' +
  '#\n' +
  '# Made with the resume-builder web builder: https://endless728.github.io/resume-builder/builder/\n' +
  '# Full field reference: https://docs.rendercv.com/\n';

const REST = {
  design: {
    theme: 'engineeringresumes',
    templates: { top_note: '*LAST_UPDATED MONTH_ABBREVIATION DAY, YEAR*' },
    typography: { line_spacing: '0.4em' },
  },
  locale: { language: 'english', last_updated: 'Last updated on' },
  settings: {
    render_command: {
      typst_path: 'rendercv_output/NAME_IN_SNAKE_CASE_CV.typ',
      pdf_path: 'rendercv_output/NAME_IN_SNAKE_CASE_CV.pdf',
      markdown_path: 'rendercv_output/NAME_IN_SNAKE_CASE_CV.md',
      html_path: 'rendercv_output/NAME_IN_SNAKE_CASE_CV.html',
      png_path: 'rendercv_output/NAME_IN_SNAKE_CASE_CV.png',
      dont_generate_markdown: true,
      dont_generate_html: true,
      dont_generate_typst: false,
      dont_generate_pdf: false,
      dont_generate_png: false,
    },
  },
};

// ---------- form state → RenderCV ----------

const t = (s: string) => s.trim();

function dateOut(d: DateValue): string | number | undefined {
  const v = d.trim();
  if (!v) return undefined;
  if (/^\d{4}$/.test(v)) return Number(v); // a bare year must be an int, or RenderCV reads it as "Jan YYYY"
  return v;
}

function datedOut(item: { location: string; start: DateValue; end: DateValue; summary: string; highlights: string }) {
  const out: Record<string, any> = {};
  const start = dateOut(item.start);
  const end = dateOut(item.end);
  if (start !== undefined) {
    out.start_date = start;
    out.end_date = end ?? 'present';
  } else if (end !== undefined) {
    out.date = end; // a single date: RenderCV accepts custom text here too ("Summer 2020")
  }
  if (t(item.location)) out.location = t(item.location);
  if (t(item.summary)) out.summary = t(item.summary);
  const hl = lines(item.highlights);
  if (hl.length) out.highlights = hl;
  return out;
}

function sectionEntries(s: Section): CvEntry[] {
  switch (s.kind) {
    case 'text':
      return paragraphs(s.text);
    case 'bullets':
      return lines(s.text).map((bullet) => ({ bullet }));
    case 'skills':
      return s.items.filter((i) => !missingFields('skills', i).length).map((i) => ({ label: t(i.label), details: t(i.details) }));
    case 'experience':
      return s.items
        .filter((i) => !missingFields('experience', i).length)
        .map((i) => ({ company: t(i.company), position: t(i.position), ...datedOut(i) }));
    case 'education':
      return s.items
        .filter((i) => !missingFields('education', i).length)
        .map((i) => ({
          institution: t(i.institution),
          area: t(i.area),
          ...(t(i.degree) ? { degree: t(i.degree) } : {}),
          ...datedOut(i),
        }));
    case 'projects':
      return s.items
        .filter((i) => !missingFields('projects', i).length)
        .map((i) => ({ name: t(i.url) ? `[${t(i.name)}](${normaliseUrl(i.url)})` : t(i.name), ...datedOut(i) }));
  }
}

export function toCv(r: Resume): Cv {
  const h = r.header;
  const cv: Cv = {};
  if (t(h.name)) cv.name = t(h.name);
  if (t(h.headline)) cv.headline = t(h.headline);
  if (t(h.location)) cv.location = t(h.location);
  if (t(h.phone)) cv.phone = t(h.phone);
  if (t(h.email)) cv.email = t(h.email);
  if (t(h.website)) cv.website = normaliseUrl(h.website);
  const social = [
    ...(t(h.linkedin) ? [{ network: 'LinkedIn', username: cleanHandle(h.linkedin, 'linkedin.com/in/') }] : []),
    ...(t(h.github) ? [{ network: 'GitHub', username: cleanHandle(h.github, 'github.com/') }] : []),
  ];
  if (social.length) cv.social_networks = social;

  const sections: Record<string, CvEntry[]> = {};
  for (const s of r.sections) {
    const entries = sectionEntries(s);
    const title = t(s.title) || 'Untitled';
    if (entries.length && !(title in sections)) sections[title] = entries;
  }
  if (Object.keys(sections).length) cv.sections = sections;
  return cv;
}

/** Accepts a bare username or a pasted profile URL. */
export function cleanHandle(v: string, prefix: string): string {
  let s = v.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
  if (s.toLowerCase().startsWith(prefix)) s = s.slice(prefix.length);
  return s.replace(/^@/, '').replace(/\/+$/, '');
}

export function toYaml(r: Resume): string {
  const doc = { cv: toCv(r), ...REST };
  return SCHEMA_COMMENT + YAML.stringify(doc, { lineWidth: 0 });
}

// ---------- RenderCV → form state ----------

const str = (v: any) => (v === undefined || v === null ? '' : String(v));
const first = (v: any) => str(Array.isArray(v) ? v[0] : v);

function datedIn(e: Record<string, any>) {
  let start = '';
  let end = '';
  if (e.date !== undefined && e.date !== null) end = str(e.date);
  else {
    start = str(e.start_date);
    end = str(e.end_date);
  }
  return {
    location: str(e.location),
    start,
    end,
    summary: str(e.summary),
    highlights: (Array.isArray(e.highlights) ? e.highlights : []).map(str).join('\n'),
  };
}

const LINK_NAME = /^\[(.+)\]\((\S+)\)$/;

export interface ImportResult {
  resume: Resume;
  warnings: string[];
}

export function fromYaml(text: string): ImportResult {
  const doc = YAML.parse(text);
  if (!doc || typeof doc !== 'object' || !doc.cv) throw new Error('This file has no "cv:" section, so it doesn\'t look like a RenderCV resume.');
  const cv: Cv = doc.cv;
  const warnings: string[] = [];

  const header = {
    name: str(cv.name),
    headline: str(cv.headline),
    location: str(cv.location),
    email: first(cv.email),
    phone: first(cv.phone),
    website: first(cv.website),
    linkedin: '',
    github: '',
  };
  if ([cv.email, cv.phone, cv.website].some((v) => Array.isArray(v) && v.length > 1))
    warnings.push('Only the first email, phone and website were imported.');

  for (const s of cv.social_networks ?? []) {
    if (s.network === 'LinkedIn') header.linkedin = s.username;
    else if (s.network === 'GitHub') header.github = s.username;
    else warnings.push(`Skipped the ${s.network} link (the builder supports LinkedIn and GitHub).`);
  }
  for (const c of cv.custom_connections ?? []) {
    const url = str(c.url);
    const li = /linkedin\.com\/in\/([^/?#]+)/i.exec(url);
    const gh = /github\.com\/([^/?#]+)/i.exec(url);
    if (li && !header.linkedin) header.linkedin = li[1];
    else if (gh && !header.github) header.github = gh[1];
    else warnings.push(`Skipped the "${c.placeholder}" link.`);
  }
  if (cv.photo) warnings.push('Skipped the photo (not supported by this theme in the builder).');

  const sections: Section[] = [];
  for (const [key, entries] of Object.entries(cv.sections ?? {})) {
    const list = (entries ?? []) as CvEntry[];
    const title = sectionTitle(key);
    const kind = list.length ? entryKind(list[0]) : null;
    if (!kind) {
      warnings.push(`Skipped the "${title}" section (its entry type isn't supported in the builder).`);
      continue;
    }
    const objs = list.filter((e) => entryKind(e) === kind) as Record<string, any>[];
    switch (kind) {
      case 'text':
        sections.push({ ...(newSection('text', title) as any), text: (list as string[]).filter((e) => typeof e === 'string').join('\n\n') });
        break;
      case 'bullet':
        sections.push({ ...(newSection('bullets', title) as any), text: objs.map((e) => str(e.bullet)).join('\n') });
        break;
      case 'one_line':
        sections.push({ id: uid(), title, kind: 'skills', items: objs.map((e) => ({ id: uid(), label: str(e.label), details: str(e.details) })) });
        break;
      case 'experience':
        sections.push({
          id: uid(),
          title,
          kind: 'experience',
          items: objs.map((e) => ({ id: uid(), company: str(e.company), position: str(e.position), ...datedIn(e) })),
        });
        break;
      case 'education':
        sections.push({
          id: uid(),
          title,
          kind: 'education',
          items: objs.map((e) => ({ id: uid(), institution: str(e.institution), area: str(e.area), degree: str(e.degree), ...datedIn(e) })),
        });
        break;
      case 'normal':
        sections.push({
          id: uid(),
          title,
          kind: 'projects',
          items: objs.map((e) => {
            const m = LINK_NAME.exec(str(e.name));
            return { id: uid(), name: m ? m[1] : str(e.name), url: m ? m[2] : str(e.url), ...datedIn(e) };
          }),
        });
        break;
    }
    if (objs.length < list.length && kind !== 'text') warnings.push(`Some entries in "${title}" had a different shape and were skipped.`);
  }

  if (doc.design?.theme && doc.design.theme !== 'engineeringresumes')
    warnings.push(`Your file uses the "${doc.design.theme}" theme. The builder previews and exports the engineeringresumes theme.`);

  return { resume: { version: 1, header, sections }, warnings };
}
