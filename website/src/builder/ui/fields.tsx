import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

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

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR + 6 - 1960 }, (_, i) => String(THIS_YEAR + 5 - i));

/**
 * Month + year picker. Stores "YYYY-MM", "YYYY", "present" or "".
 * Keeps its own month/year state so a month picked before the year isn't lost:
 * the value only becomes a date once a year is chosen.
 */
export function DateField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowPresent?: boolean;
  presentLabel?: string;
}) {
  const id = useId();
  const present = props.value === 'present';
  const initial = splitDate(present ? '' : props.value);
  const [custom, setCustom] = useState(initial === null);
  const [month, setMonth] = useState(initial?.month ?? '');
  const [year, setYear] = useState(initial?.year ?? '');
  const emitted = useRef(props.value);

  // Follow outside changes (import, load example, start over), but not our own.
  useEffect(() => {
    if (props.value === emitted.current) return;
    emitted.current = props.value;
    if (props.value === 'present') return;
    const p = splitDate(props.value);
    if (p) {
      setMonth(p.month);
      setYear(p.year);
      setCustom(false);
    } else {
      setCustom(true);
    }
  }, [props.value]);

  const emit = (v: string) => {
    emitted.current = v;
    props.onChange(v);
  };
  const update = (y: string, m: string) => {
    setYear(y);
    setMonth(m);
    emit(y ? (m ? `${y}-${m}` : y) : '');
  };

  return (
    <div className="rb-field rb-date">
      <label htmlFor={id}>{props.label}</label>
      {custom ? (
        <div className="rb-row">
          <input id={id} value={props.value} placeholder="e.g. Summer 2020" onChange={(e) => emit(e.target.value)} />
          <button type="button" className="rb-link" onClick={() => { setCustom(false); update('', ''); }}>
            Use picker
          </button>
        </div>
      ) : (
        <div className="rb-row">
          <select aria-label={`${props.label} month`} disabled={present} value={month} onChange={(e) => update(year, e.target.value)}>
            <option value="">Month</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1).padStart(2, '0')}>
                {m}
              </option>
            ))}
          </select>
          <select id={id} aria-label={`${props.label} year`} disabled={present} value={year} onChange={(e) => update(e.target.value, month)}>
            <option value="">Year</option>
            {year && !YEARS.includes(year) && <option value={year}>{year}</option>}
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}
      {props.allowPresent && !custom && (
        <label className="rb-check">
          <input
            type="checkbox"
            checked={present}
            onChange={(e) => emit(e.target.checked ? 'present' : year ? (month ? `${year}-${month}` : year) : '')}
          />
          {props.presentLabel ?? 'Ongoing'}
        </label>
      )}
      {!custom && month && !year && !present && <small>Pick a year too.</small>}
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
