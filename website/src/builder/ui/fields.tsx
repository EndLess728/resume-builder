import { useId, useState, type ReactNode } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  error?: string | null;
  multiline?: boolean | number;
  type?: string;
  wide?: boolean;
  autoComplete?: string;
}) {
  const id = useId();
  const rows = typeof props.multiline === 'number' ? props.multiline : 4;
  return (
    <div className={`rb-field${props.wide ? ' rb-wide' : ''}`}>
      <label htmlFor={id}>{props.label}</label>
      {props.multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={props.value}
          placeholder={props.placeholder}
          onChange={(e) => props.onChange(e.target.value)}
          aria-invalid={!!props.error}
        />
      ) : (
        <input
          id={id}
          type={props.type ?? 'text'}
          value={props.value}
          placeholder={props.placeholder}
          autoComplete={props.autoComplete ?? 'off'}
          onChange={(e) => props.onChange(e.target.value)}
          aria-invalid={!!props.error}
        />
      )}
      {props.error ? <small className="rb-error">{props.error}</small> : props.hint ? <small>{props.hint}</small> : null}
    </div>
  );
}

function splitDate(v: string): { year: string; month: string } | null {
  if (!v) return { year: '', month: '' };
  let m = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(v);
  if (m) return { year: m[1], month: m[2] };
  m = /^(\d{4})$/.exec(v);
  if (m) return { year: m[1], month: '' };
  return null; // custom text such as "Summer 2020"
}

/** Month + year picker. Stores "YYYY-MM", "YYYY", "present" or "". */
export function DateField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowPresent?: boolean;
  presentLabel?: string;
}) {
  const id = useId();
  const present = props.value === 'present';
  const parts = splitDate(present ? '' : props.value);
  const [custom, setCustom] = useState(parts === null);

  const set = (year: string, month: string) => {
    const y = year.replace(/\D/g, '').slice(0, 4);
    props.onChange(y ? (month ? `${y}-${month}` : y) : '');
  };

  return (
    <div className="rb-field rb-date">
      <label htmlFor={id}>{props.label}</label>
      {custom ? (
        <div className="rb-row">
          <input id={id} value={props.value} placeholder="e.g. Summer 2020" onChange={(e) => props.onChange(e.target.value)} />
          <button type="button" className="rb-link" onClick={() => { setCustom(false); props.onChange(''); }}>
            Use picker
          </button>
        </div>
      ) : (
        <div className="rb-row">
          <select
            aria-label={`${props.label} month`}
            disabled={present}
            value={parts?.month ?? ''}
            onChange={(e) => set(parts?.year ?? '', e.target.value)}
          >
            <option value="">Month</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1).padStart(2, '0')}>
                {m}
              </option>
            ))}
          </select>
          <input
            id={id}
            inputMode="numeric"
            placeholder="Year"
            disabled={present}
            value={parts?.year ?? ''}
            onChange={(e) => set(e.target.value, parts?.month ?? '')}
          />
        </div>
      )}
      {props.allowPresent && !custom && (
        <label className="rb-check">
          <input type="checkbox" checked={present} onChange={(e) => props.onChange(e.target.checked ? 'present' : '')} />
          {props.presentLabel ?? 'Ongoing'}
        </label>
      )}
    </div>
  );
}

export function IconButton(props: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      className={`rb-icon${props.danger ? ' rb-danger' : ''}`}
      title={props.label}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export const Up = () => <span aria-hidden>↑</span>;
export const Down = () => <span aria-hidden>↓</span>;
export const Trash = () => <span aria-hidden>✕</span>;
