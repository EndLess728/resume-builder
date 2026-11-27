import { useEffect, useMemo, useRef, useState } from 'react';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { TypstClient } from '../compiler';
import { emptyResume, newSection, SECTION_KINDS, type Header, type Resume, type Section, type SectionKind } from '../model';
import { renderTypst } from '../render';
import { fromYaml, toCv, toYaml } from '../rendercv';
import exampleYaml from '../example_CV.yaml?raw';
import { Field } from './fields';
import { SectionEditor } from './SectionEditor';
import { Dropzone } from './Dropzone';
import '../builder.css';

const STORAGE_KEY = 'resume-builder:draft:v1';
const DOCS = import.meta.env.BASE_URL.replace(/\/?$/, '/');

function load(): Resume | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const r = raw ? JSON.parse(raw) : null;
    return r?.version === 1 ? r : null;
  } catch {
    return null;
  }
}

function save(r: Resume) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  } catch {
    /* private mode or storage full: the draft just won't survive a reload */
  }
}

function download(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fileBase = (name: string) => `${(name.trim() || 'Resume').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '')}_CV`;

const emailOk = (v: string) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
function friendlyError(msg: string): string {
  const v = /unknown variable: ([\w-]+)/.exec(msg);
  if (v) return `“#${v[1]}” is read as a formatting command. Remove the # or put a space after it.`;
  return msg;
}

function phoneError(v: string): string | null {
  if (!v.trim()) return null;
  if (!v.trim().startsWith('+')) return 'Start with your country code, e.g. +91 98765 43210';
  const p = parsePhoneNumberFromString(v);
  return p && p.isPossible() ? null : "This doesn't look like a complete phone number.";
}

export default function Builder() {
  const [resume, setResume] = useState<Resume>(() => load() ?? emptyResume());
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [pages, setPages] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [engine, setEngine] = useState<{ status: 'loading' | 'ready' | 'failed'; error?: string }>({ status: 'loading' });
  const [updating, setUpdating] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'info' | 'warn' | 'error'; text: string; items?: string[] } | null>(null);
  const client = useRef<TypstClient | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const source = useMemo(() => renderTypst(toCv(resume)), [resume]);
  const isEmpty = !resume.header.name && resume.sections.every((s) => ('text' in s ? !s.text.trim() : s.items.every((i: any) => Object.entries(i).every(([k, v]) => k === 'id' || !v))));

  // Start the compiler once.
  useEffect(() => {
    const c = new TypstClient();
    client.current = c;
    c.onStatus = (status, error) => setEngine({ status, error });
    c.onPreview = (p, err) => {
      setUpdating(false);
      setPreviewError(err && friendlyError(err));
      if (p) setPages(p);
    };
    return () => c.dispose();
  }, []);

  // Recompile shortly after typing stops, and autosave.
  useEffect(() => {
    save(resume);
    if (engine.status !== 'ready') return;
    setUpdating(true);
    const t = setTimeout(() => client.current?.preview(source), 250);
    return () => clearTimeout(t);
  }, [source, engine.status]);

  // Page images as blob URLs (SVG in <img> never runs scripts).
  const pageUrls = useMemo(() => pages.map((svg) => URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))), [pages]);
  useEffect(() => () => pageUrls.forEach(URL.revokeObjectURL), [pageUrls]);

  const setHeader = (k: keyof Header) => (v: string) => setResume((r) => ({ ...r, header: { ...r.header, [k]: v } }));
  const setSections = (fn: (s: Section[]) => Section[]) => setResume((r) => ({ ...r, sections: fn(r.sections) }));

  const replaceAll = (next: Resume, msg?: typeof notice) => {
    if (!isEmpty && !confirm('This replaces everything in the form. Continue?')) return;
    setResume(next);
    setNotice(msg ?? null);
  };

  const loadExample = () => replaceAll(fromYaml(exampleYaml).resume, { kind: 'info', text: 'Loaded the example. Change anything and the preview updates as you type.' });

  const importFile = async (file: File) => {
    if (/\.ya?ml$/i.test(file.name)) {
      try {
        const { resume: r, warnings } = fromYaml(await file.text());
        replaceAll(r, warnings.length ? { kind: 'warn', text: `Imported ${file.name}, with a few things left out:`, items: warnings } : { kind: 'info', text: `Imported ${file.name}.` });
      } catch (e: any) {
        setNotice({ kind: 'error', text: `Couldn't read ${file.name}: ${e.message}` });
      }
      return;
    }
    // An old resume (PDF, Word, text): read it in the browser and fill the form.
    setReading(file.name);
    try {
      const { importResume } = await import('../import');
      const { resume: r, found, warnings } = await importResume(file);
      replaceAll(r, {
        kind: 'warn',
        text: `Filled the form from ${file.name}${found.length ? ` (found ${found.join(', ')})` : ''}. Reading a resume automatically isn't perfect, so please check each section and fix anything that landed in the wrong place.`,
        items: warnings,
      });
    } catch (e: any) {
      setNotice({ kind: 'error', text: `Couldn't read ${file.name}: ${e.message}` });
    } finally {
      setReading(null);
    }
  };

  const downloadPdf = async () => {
    if (!client.current || engine.status !== 'ready') return;
    setBusyPdf(true);
    try {
      download((await client.current.pdf(source)) as Uint8Array<ArrayBuffer>, `${fileBase(resume.header.name)}.pdf`, 'application/pdf');
    } catch (e: any) {
      setNotice({ kind: 'error', text: `Couldn't make the PDF: ${friendlyError(e.message)}` });
    } finally {
      setBusyPdf(false);
    }
  };

  const addSection = (kind: SectionKind) => {
    const meta = SECTION_KINDS.find((k) => k.kind === kind)!;
    const taken = new Set(resume.sections.map((s) => s.title));
    let title = meta.defaultTitle;
    for (let n = 2; taken.has(title); n++) title = `${meta.defaultTitle} ${n}`;
    setSections((s) => [...s, newSection(kind, title)]);
  };

  const dupTitles = resume.sections.map((s) => s.title.trim()).filter((t, i, all) => t && all.indexOf(t) !== i);
  const h = resume.header;

  return (
    <div className={`rb-app rb-tab-${tab}`}>
      <div className="rb-toolbar" role="toolbar" aria-label="Resume actions">
        <div className="rb-toolbar-group">
          <button type="button" onClick={() => fileInput.current?.click()} disabled={!!reading}
            title="PDF, Word (.docx), text, or a RenderCV YAML file">{reading ? 'Reading…' : 'Upload old resume'}</button>
          <button type="button" onClick={loadExample}>Load example</button>
          <button type="button" onClick={() => replaceAll(emptyResume())}>Start over</button>
          <input ref={fileInput} type="file" hidden
            accept=".pdf,.docx,.txt,.yaml,.yml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/yaml"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
        </div>
        <div className="rb-toolbar-group">
          <button type="button" onClick={() => download(toYaml(resume), `${fileBase(h.name)}.yaml`, 'text/yaml')}
            title="For the GitHub workflow: drop this file into your resume repo">Download YAML</button>
          <button type="button" className="rb-primary" onClick={downloadPdf} disabled={engine.status !== 'ready' || busyPdf}>
            {busyPdf ? 'Making PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {notice && !reading && (
        <div className={`rb-notice rb-${notice.kind}`} role="status">
          <div>
            {notice.text}
            {notice.items && <ul>{notice.items.map((w) => <li key={w}>{w}</li>)}</ul>}
          </div>
          <button type="button" className="rb-link" onClick={() => setNotice(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      <div className="rb-split">
        <div className="rb-form">
          <Dropzone size={isEmpty ? 'large' : 'compact'} reading={reading} onFile={importFile} onExample={loadExample} />

          <section className="rb-card">
            <header className="rb-card-head"><h2>Your details</h2></header>
            <div className="rb-card-body rb-grid">
              <Field label="Full name" value={h.name} onChange={setHeader('name')} placeholder="Priya Sharma" autoComplete="name" />
              <Field label="Headline" value={h.headline} onChange={setHeader('headline')} placeholder="QA Engineer" />
              <Field label="Email" type="email" value={h.email} onChange={setHeader('email')} placeholder="priya@example.com" autoComplete="email"
                error={emailOk(h.email) ? null : "This doesn't look like an email address."} />
              <Field label="Phone" type="tel" value={h.phone} onChange={setHeader('phone')} placeholder="+91 98765 43210" autoComplete="tel"
                error={phoneError(h.phone)} />
              <Field label="City" value={h.location} onChange={setHeader('location')} placeholder="Chandigarh, India" />
              <Field label="Website" value={h.website} onChange={setHeader('website')} placeholder="priya.dev" />
              <Field label="LinkedIn" value={h.linkedin} onChange={setHeader('linkedin')} placeholder="priya-sharma" hint="Your username or profile link" />
              <Field label="GitHub" value={h.github} onChange={setHeader('github')} placeholder="priyasharma" hint="Optional" />
            </div>
          </section>

          {resume.sections.map((s, i) => (
            <SectionEditor key={s.id} section={s} index={i} count={resume.sections.length}
              onChange={(next) => setSections((all) => all.map((x) => (x.id === s.id ? next : x)))}
              onMove={(dir) => setSections((all) => {
                const next = [...all];
                [next[i], next[i + dir]] = [next[i + dir], next[i]];
                return next;
              })}
              onRemove={() => setSections((all) => all.filter((x) => x.id !== s.id))} />
          ))}
          {dupTitles.length > 0 && (
            <p className="rb-error">Two sections are called “{dupTitles[0]}”. Rename one, or only the first will be used.</p>
          )}

          <div className="rb-card rb-add-section">
            <span>Add a section</span>
            <div className="rb-chips">
              {SECTION_KINDS.map((k) => (
                <button key={k.kind} type="button" title={k.hint} onClick={() => addSection(k.kind)}>+ {k.label}</button>
              ))}
            </div>
          </div>

          <p className="rb-footnote">
            Using the GitHub workflow? <strong>Download YAML</strong> gives you a file that drops straight into your resume repo.
            See <a href={`${DOCS}getting-started/quick-start/`}>Quick start</a>.
          </p>
        </div>

        <div className="rb-preview" aria-live="polite">
          <div className="rb-preview-status">
            {engine.status === 'loading' && <span><span className="rb-spinner" /> Loading the PDF engine (about 8 MB, first visit only)…</span>}
            {engine.status === 'failed' && <span className="rb-error">The preview engine couldn't start: {engine.error}. Try a recent Chrome, Edge, Firefox or Safari.</span>}
            {engine.status === 'ready' && (previewError
              ? <span className="rb-error">Preview error: {previewError}</span>
              : <span>{updating ? <><span className="rb-spinner" /> Updating…</> : `Live preview · ${pages.length} page${pages.length === 1 ? '' : 's'}`}</span>)}
          </div>
          <div className={`rb-pages${updating ? ' rb-stale' : ''}`}>
            {pageUrls.map((u, i) => <img key={u} src={u} alt={`Resume page ${i + 1}`} className="rb-page" />)}
            {!pageUrls.length && engine.status !== 'failed' && <div className="rb-page rb-page-placeholder" />}
          </div>
        </div>
      </div>

      <nav className="rb-tabs" aria-label="Switch view">
        <button type="button" aria-pressed={tab === 'edit'} onClick={() => setTab('edit')}>Edit</button>
        <button type="button" aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>Preview</button>
      </nav>
    </div>
  );
}
