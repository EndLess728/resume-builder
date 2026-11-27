import { useState } from 'react';
import { missingFields, newItem, SECTION_KINDS, type Section } from '../model';
import { dateOrder } from '../render';
import { DateField, Down, Field, IconButton, Trash, Up } from './fields';

const BULLET_HINT = 'One bullet per line. Wrap words in **double stars** to make them bold.';

type AnyItem = Record<string, any> & { id: string };

function itemTitle(kind: Section['kind'], it: AnyItem): string {
  switch (kind) {
    case 'experience':
      return [it.position, it.company].filter(Boolean).join(' · ');
    case 'education':
      return [it.institution, [it.degree, it.area].filter(Boolean).join(' in ')].filter(Boolean).join(' · ');
    case 'projects':
      return it.name;
    case 'skills':
      return it.label;
    default:
      return '';
  }
}

const NOUN: Record<string, string> = { experience: 'job', education: 'school', projects: 'entry', skills: 'row' };

export function SectionEditor(props: {
  section: Section;
  index: number;
  count: number;
  onChange: (s: Section) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { section: s, index, count } = props;
  const [open, setOpen] = useState(true);
  const meta = SECTION_KINDS.find((k) => k.kind === s.kind)!;
  const set = (patch: Partial<Section>) => props.onChange({ ...s, ...patch } as Section);

  return (
    <section className="rb-card">
      <header className="rb-card-head">
        <button type="button" className="rb-collapse" aria-expanded={open} onClick={() => setOpen(!open)} aria-label={open ? 'Collapse section' : 'Expand section'}>
          {open ? '▾' : '▸'}
        </button>
        <input className="rb-section-title" value={s.title} aria-label="Section title" onChange={(e) => set({ title: e.target.value })} />
        <span className="rb-kind">{meta.label}</span>
        <IconButton label="Move section up" disabled={index === 0} onClick={() => props.onMove(-1)}><Up /></IconButton>
        <IconButton label="Move section down" disabled={index === count - 1} onClick={() => props.onMove(1)}><Down /></IconButton>
        <IconButton label="Delete section" danger onClick={() => { if (confirm(`Delete the "${s.title}" section?`)) props.onRemove(); }}><Trash /></IconButton>
      </header>

      {open && (
        <div className="rb-card-body">
          {s.kind === 'text' && (
            <Field label="Text" multiline={5} value={s.text} wide onChange={(text) => set({ text })}
              placeholder="A few lines about who you are and what you're good at."
              hint="Leave an empty line between paragraphs. **Bold** and *italic* work." />
          )}
          {s.kind === 'bullets' && (
            <Field label="Items" multiline={5} value={s.text} wide onChange={(text) => set({ text })}
              placeholder={'ISTQB Certified Tester (2023)\nEmployee of the month, March 2024'} hint={BULLET_HINT} />
          )}
          {s.kind !== 'text' && s.kind !== 'bullets' && (
            <ItemList section={s} onItems={(items) => set({ items } as any)} />
          )}
        </div>
      )}
    </section>
  );
}

function ItemList({ section, onItems }: { section: Extract<Section, { items: any[] }>; onItems: (items: AnyItem[]) => void }) {
  const items = section.items as AnyItem[];
  const kind = section.kind;
  const update = (id: string, patch: Partial<AnyItem>) => onItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onItems(next);
  };

  if (kind === 'skills') {
    return (
      <div className="rb-skills">
        {items.map((it, i) => (
          <div className="rb-skill-row" key={it.id}>
            <Field label={i === 0 ? 'Label' : ''} value={it.label} placeholder="Tools" onChange={(label) => update(it.id, { label })} />
            <Field label={i === 0 ? 'Details' : ''} value={it.details} placeholder="Jira, Postman, Selenium" onChange={(details) => update(it.id, { details })} />
            <div className="rb-row-actions">
              <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><Up /></IconButton>
              <IconButton label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}><Down /></IconButton>
              <IconButton label="Remove row" danger onClick={() => onItems(items.filter((x) => x.id !== it.id))}><Trash /></IconButton>
            </div>
          </div>
        ))}
        <button type="button" className="rb-add" onClick={() => onItems([...items, newItem(kind)])}>+ Add row</button>
      </div>
    );
  }

  return (
    <div className="rb-items">
      {items.map((it, i) => (
        <ItemCard key={it.id} kind={kind} item={it} first={i === 0} last={i === items.length - 1}
          onChange={(patch) => update(it.id, patch)} onMove={(d) => move(i, d)}
          onRemove={() => onItems(items.filter((x) => x.id !== it.id))} />
      ))}
      <button type="button" className="rb-add" onClick={() => onItems([...items, newItem(kind)])}>+ Add {NOUN[kind]}</button>
    </div>
  );
}

function ItemCard(props: {
  kind: Section['kind'];
  item: AnyItem;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<AnyItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { kind, item: it, onChange: set } = props;
  const [open, setOpen] = useState(!itemTitle(kind, it));
  const missing = missingFields(kind, it);
  const badOrder = !dateOrder(it.start || undefined, it.end || undefined);
  const title = itemTitle(kind, it) || `New ${NOUN[kind]}`;

  return (
    <div className={`rb-item${open ? ' rb-open' : ''}`}>
      <div className="rb-item-head">
        <button type="button" className="rb-item-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span>{open ? '▾' : '▸'}</span>
          <span className="rb-item-title">{title}</span>
          {missing.length > 0 && <span className="rb-badge" title="Not shown until filled in">Needs {missing.join(', ')}</span>}
        </button>
        <IconButton label="Move up" disabled={props.first} onClick={() => props.onMove(-1)}><Up /></IconButton>
        <IconButton label="Move down" disabled={props.last} onClick={() => props.onMove(1)}><Down /></IconButton>
        <IconButton label="Remove" danger onClick={() => { if (confirm(`Remove "${title}"?`)) props.onRemove(); }}><Trash /></IconButton>
      </div>

      {open && (
        <div className="rb-grid">
          {kind === 'experience' && (
            <>
              <Field label="Job title *" value={it.position} placeholder="QA Engineer" onChange={(position) => set({ position })} />
              <Field label="Company *" value={it.company} placeholder="Acme Pvt Ltd" onChange={(company) => set({ company })} />
            </>
          )}
          {kind === 'education' && (
            <>
              <Field label="School / university *" value={it.institution} placeholder="Panjab University" wide onChange={(institution) => set({ institution })} />
              <Field label="Degree" value={it.degree} placeholder="B.Tech" onChange={(degree) => set({ degree })} />
              <Field label="Field of study *" value={it.area} placeholder="Computer Science" onChange={(area) => set({ area })} />
            </>
          )}
          {kind === 'projects' && (
            <>
              <Field label="Name *" value={it.name} placeholder="Payments app test suite" onChange={(name) => set({ name })} />
              <Field label="Link" value={it.url} placeholder="github.com/you/project" type="url" onChange={(url) => set({ url })} hint="Optional. Makes the name clickable." />
            </>
          )}

          <DateField label="Start" value={it.start} onChange={(start) => set({ start })} />
          <DateField label={it.start ? 'End' : 'Date'} value={it.end} onChange={(end) => set({ end })}
            allowPresent={!!it.start} presentLabel={kind === 'experience' ? 'I work here now' : 'Ongoing'} />
          {badOrder && <small className="rb-error rb-wide">The start date is after the end date.</small>}
          <Field label="Location" value={it.location} placeholder={kind === 'projects' ? '' : 'Chandigarh, India'} onChange={(location) => set({ location })} />

          <Field label="Summary (optional)" value={it.summary} wide
            placeholder={kind === 'projects' ? 'What it is, in one sentence' : 'A line under the title, before the bullets'}
            onChange={(summary) => set({ summary })} />
          <Field label={kind === 'education' ? 'Highlights' : 'Bullet points'} multiline={kind === 'experience' ? 5 : 3} wide value={it.highlights}
            placeholder={kind === 'experience' ? 'Tested 3 mobile apps end to end before every release\nFound and reported 200+ bugs in Jira' : ''}
            hint={BULLET_HINT} onChange={(highlights) => set({ highlights })} />
        </div>
      )}
    </div>
  );
}
