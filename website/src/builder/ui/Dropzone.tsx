import { useEffect, useRef, useState } from 'react';

const ACCEPT =
  '.pdf,.docx,.txt,.yaml,.yml,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/yaml';

const hasFiles = (e: DragEvent | React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/**
 * Upload area for an old resume. `size="large"` is the empty-form welcome;
 * `size="compact"` is a slim bar once the form has content. While a file is
 * dragged anywhere over the window, a full-page overlay appears, so a drop
 * outside the box still works (and never makes the browser open the file).
 */
export function Dropzone(props: {
  size: 'large' | 'compact';
  reading: string | null;
  onFile: (f: File) => void;
  onExample?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false); // over this box
  const [windowDrag, setWindowDrag] = useState(false); // anywhere over the page
  const depth = useRef(0);
  const onFile = useRef(props.onFile);
  onFile.current = props.onFile;

  useEffect(() => {
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current++;
      setWindowDrag(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setWindowDrag(false);
    };
    const overWin = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault(); // allow dropping anywhere
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setWindowDrag(false);
      setOver(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) onFile.current(f);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', overWin);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', overWin);
      window.removeEventListener('drop', drop);
    };
  }, []);

  const open = () => {
    if (!props.reading) input.current?.click();
  };

  const busy = !!props.reading;
  const cls = `rb-drop rb-drop-${props.size}${over || windowDrag ? ' rb-drop-active' : ''}${busy ? ' rb-drop-busy' : ''}`;

  return (
    <>
      <div
        className={cls}
        role="button"
        tabIndex={0}
        aria-label="Upload your old resume: PDF, Word or text file"
        aria-busy={busy}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        onDragEnter={(e) => hasFiles(e) && setOver(true)}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
        }}
      >
        <svg className="rb-drop-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M12 17v-6m-2.5 2.5L12 11l2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {busy ? (
          <div className="rb-drop-text">
            <strong><span className="rb-spinner" /> Reading {props.reading}…</strong>
            <span>This takes a few seconds.</span>
          </div>
        ) : props.size === 'large' ? (
          <div className="rb-drop-text">
            <strong className="rb-pointer-only">Drop your old resume here</strong>
            <strong className="rb-touch-only">Tap to upload your old resume</strong>
            <span><span className="rb-pointer-only">or <u>choose a file</u>. </span>PDF, Word (.docx) or text.</span>
            <span className="rb-drop-note">The form fills itself in. Your file is read in this browser and never uploaded.</span>
          </div>
        ) : (
          <div className="rb-drop-text">
            <strong className="rb-pointer-only">Drop a resume here to fill the form again</strong>
            <strong className="rb-touch-only">Upload a resume to fill the form again</strong>
            <span><span className="rb-pointer-only">or <u>choose a file</u> </span>(PDF, Word, text or YAML)</span>
          </div>
        )}
        <input
          ref={input}
          type="file"
          hidden
          accept={ACCEPT}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {props.size === 'large' && props.onExample && !busy && (
        <p className="rb-drop-alt">
          No resume to start from? Fill in the form below, or{' '}
          <button type="button" className="rb-link" onClick={props.onExample}>load the example</button> to see how it works.
        </p>
      )}

      {windowDrag && (
        <div className="rb-drop-overlay" aria-hidden="true">
          <div>
            <strong>Drop your resume to read it</strong>
            <span>PDF, Word (.docx), text or YAML</span>
          </div>
        </div>
      )}
    </>
  );
}
