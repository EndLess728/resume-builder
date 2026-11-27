// The builder's own state. It maps one-to-one onto a RenderCV `cv:` block, but
// is shaped for forms: every section has a fixed kind, every list item has an
// id for React, and bullet lists are plain textareas (one bullet per line).

export type DateValue = string; // "YYYY-MM", "YYYY", "present", "" or any custom text

export interface Header {
  name: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string; // username only
  github: string; // username only
}

interface Dated {
  location: string;
  start: DateValue;
  end: DateValue;
  summary: string;
  highlights: string; // one per line
}

export interface ExperienceItem extends Dated {
  id: string;
  position: string;
  company: string;
}

export interface EducationItem extends Dated {
  id: string;
  institution: string;
  degree: string;
  area: string;
}

export interface ProjectItem extends Dated {
  id: string;
  name: string;
  url: string;
}

export interface SkillItem {
  id: string;
  label: string;
  details: string;
}

interface SectionBase {
  id: string;
  title: string;
}

export type Section =
  | (SectionBase & { kind: 'text'; text: string })
  | (SectionBase & { kind: 'bullets'; text: string })
  | (SectionBase & { kind: 'skills'; items: SkillItem[] })
  | (SectionBase & { kind: 'experience'; items: ExperienceItem[] })
  | (SectionBase & { kind: 'education'; items: EducationItem[] })
  | (SectionBase & { kind: 'projects'; items: ProjectItem[] });

export type SectionKind = Section['kind'];

export interface Resume {
  version: 1;
  header: Header;
  sections: Section[];
}

export const SECTION_KINDS: { kind: SectionKind; label: string; hint: string; defaultTitle: string }[] = [
  { kind: 'text', label: 'Paragraph', hint: 'A short block of text, like a summary', defaultTitle: 'Summary' },
  { kind: 'skills', label: 'Skills', hint: 'Label: details rows', defaultTitle: 'Skills' },
  { kind: 'experience', label: 'Work experience', hint: 'Jobs with dates and bullet points', defaultTitle: 'Experience' },
  { kind: 'education', label: 'Education', hint: 'Schools, degrees and dates', defaultTitle: 'Education' },
  { kind: 'projects', label: 'Projects / entries', hint: 'Named items with a link, dates and bullets', defaultTitle: 'Projects' },
  { kind: 'bullets', label: 'Bullet list', hint: 'Simple list, one item per line', defaultTitle: 'Achievements' },
];

export const uid = () => Math.random().toString(36).slice(2, 10);

const dated = (): Dated => ({ location: '', start: '', end: '', summary: '', highlights: '' });

export function newItem(kind: SectionKind): any {
  switch (kind) {
    case 'skills':
      return { id: uid(), label: '', details: '' };
    case 'experience':
      return { id: uid(), position: '', company: '', ...dated() };
    case 'education':
      return { id: uid(), institution: '', degree: '', area: '', ...dated() };
    case 'projects':
      return { id: uid(), name: '', url: '', ...dated() };
    default:
      return null;
  }
}

export function newSection(kind: SectionKind, title?: string): Section {
  const meta = SECTION_KINDS.find((k) => k.kind === kind)!;
  const base = { id: uid(), title: title ?? meta.defaultTitle };
  if (kind === 'text' || kind === 'bullets') return { ...base, kind, text: '' } as Section;
  return { ...base, kind, items: [newItem(kind)] } as Section;
}

export function emptyResume(): Resume {
  return {
    version: 1,
    header: { name: '', headline: '', location: '', email: '', phone: '', website: '', linkedin: '', github: '' },
    sections: [
      newSection('text', 'Profile Summary'),
      newSection('skills'),
      newSection('experience'),
      newSection('projects'),
      newSection('education'),
    ],
  };
}

export const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

export const paragraphs = (s: string) =>
  s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

// Fields RenderCV requires, per item kind. Items missing one are left out of
// the preview and the YAML (RenderCV would reject them), and flagged in the form.
export function missingFields(kind: SectionKind, item: any): string[] {
  const req: Record<string, [string, string][]> = {
    skills: [['label', 'label'], ['details', 'details']],
    experience: [['position', 'job title'], ['company', 'company']],
    education: [['institution', 'school'], ['area', 'field of study']],
    projects: [['name', 'name']],
  };
  return (req[kind] ?? []).filter(([k]) => !String(item[k] ?? '').trim()).map(([, label]) => label);
}
