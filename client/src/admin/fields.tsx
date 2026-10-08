import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/* Form building blocks for the admin page. */

type TextProps = {
  autoFocus?: boolean;
  hint?: ReactNode;
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  type?: "text" | "email" | "url" | "month" | "number" | "password";
  value: string;
};

export function Text({ autoFocus, hint, label, multiline, onChange, placeholder, rows = 3, type = "text", value }: TextProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          aria-describedby={hintId}
          autoFocus={autoFocus}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          value={value}
        />
      ) : (
        <input
          aria-describedby={hintId}
          autoFocus={autoFocus}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
      )}
      {hint && (
        <p className="adm-hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

const splitLines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);
const splitCommas = (text: string) => text.split(",").map((part) => part.trim()).filter(Boolean);

/**
 * A list of strings edited as text: one item per line (or comma-separated with `commas`).
 * Keeps the raw text while typing so empty lines and trailing commas don't vanish.
 */
export function TextList({
  commas,
  hint,
  label,
  onChange,
  placeholder,
  rows = 4,
  value,
}: {
  commas?: boolean;
  hint?: ReactNode;
  label: string;
  onChange: (value: string[]) => void;
  placeholder?: string;
  rows?: number;
  value: string[];
}) {
  const join = (items: string[]) => items.join(commas ? ", " : "\n");
  const [text, setText] = useState(() => join(value));
  const id = useId();
  const update = (next: string) => {
    setText(next);
    onChange(commas ? splitCommas(next) : splitLines(next));
  };
  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      {commas ? (
        <input aria-describedby={`${id}-hint`} id={id} onChange={(event) => update(event.target.value)} placeholder={placeholder} value={text} />
      ) : (
        <textarea aria-describedby={`${id}-hint`} id={id} onChange={(event) => update(event.target.value)} placeholder={placeholder} rows={rows} value={text} />
      )}
      <p className="adm-hint" id={`${id}-hint`}>
        {hint ?? (commas ? "Separate with commas." : "One per line.")}
      </p>
    </div>
  );
}

export function Checkbox({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <label className="adm-check">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}

/** Cards for a list of items, with add, remove and move up/down. */
export function ListEditor<T>({
  addLabel,
  items,
  newItem,
  onChange,
  render,
  title,
}: {
  addLabel: string;
  items: T[];
  newItem: () => T;
  onChange: (items: T[]) => void;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  title: (item: T, index: number) => string;
}) {
  // Stable keys per card, so text being typed stays with its item when items move.
  const keys = useRef<number[]>([]);
  const counter = useRef(0);
  while (keys.current.length < items.length) keys.current.push(counter.current++);
  keys.current.length = items.length;

  const listRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const focusAfter = useRef<{ index: number; target: "first" | "move-up" | "move-down" } | null>(null);

  // After add / remove / keyboard move, put focus somewhere sensible (React has re-rendered by now).
  useEffect(() => {
    const request = focusAfter.current;
    if (!request || !listRef.current) return;
    focusAfter.current = null;
    const cards = listRef.current.querySelectorAll<HTMLElement>(":scope > .adm-card");
    const card = cards[Math.min(request.index, cards.length - 1)];
    if (!card) {
      listRef.current.querySelector<HTMLElement>(".adm-add")?.focus();
      return;
    }
    const selector = request.target === "first" ? "input, textarea, button" : `[data-tool="${request.target}"]`;
    card.querySelector<HTMLElement>(selector)?.focus();
  });

  const name = (item: T, index: number) => title(item, index) || "Untitled";

  const move = (from: number, to: number, refocus?: "move-up" | "move-down") => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const [key] = keys.current.splice(from, 1);
    keys.current.splice(to, 0, key);
    if (refocus) focusAfter.current = { index: to, target: refocus };
    setAnnouncement(`${name(item, from)} moved to position ${to + 1} of ${items.length}.`);
    onChange(next);
  };

  const remove = (index: number) => {
    if (!window.confirm(`Remove "${name(items[index], index)}"?`)) return;
    setAnnouncement(`${name(items[index], index)} removed.`);
    keys.current.splice(index, 1);
    focusAfter.current = { index, target: "first" };
    onChange(items.filter((_, i) => i !== index));
  };

  const add = () => {
    focusAfter.current = { index: items.length, target: "first" };
    setAnnouncement(`${addLabel.replace(/^Add /, "")} added as item ${items.length + 1}.`);
    onChange([...items, newItem()]);
  };

  // Alt + ↑ / ↓ anywhere inside a card moves that card.
  const onCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    move(index, event.key === "ArrowUp" ? index - 1 : index + 1, event.key === "ArrowUp" ? "move-up" : "move-down");
  };

  return (
    <div className="adm-list" ref={listRef}>
      {items.map((item, index) => (
        <div
          aria-label={`${name(item, index)}, item ${index + 1} of ${items.length}`}
          className="adm-card"
          key={keys.current[index]}
          onKeyDown={(event) => onCardKeyDown(event, index)}
          role="group"
        >
          <div className="adm-card__head">
            <span aria-hidden="true" className="adm-card__num">
              {index + 1}
            </span>
            <strong>{name(item, index)}</strong>
            <div className="adm-card__tools">
              <button
                aria-disabled={index === 0}
                aria-label={`Move ${name(item, index)} up`}
                data-tool="move-up"
                onClick={() => move(index, index - 1, "move-up")}
                title="Move up (Alt+↑)"
                type="button"
              >
                ↑
              </button>
              <button
                aria-disabled={index === items.length - 1}
                aria-label={`Move ${name(item, index)} down`}
                data-tool="move-down"
                onClick={() => move(index, index + 1, "move-down")}
                title="Move down (Alt+↓)"
                type="button"
              >
                ↓
              </button>
              <button aria-label={`Remove ${name(item, index)}`} className="adm-danger" onClick={() => remove(index)} title="Remove" type="button">
                ✕
              </button>
            </div>
          </div>
          <div className="adm-card__body">
            {render(item, (patch) => onChange(items.map((current, i) => (i === index ? { ...current, ...patch } : current))), index)}
          </div>
        </div>
      ))}
      <button className="adm-add" onClick={add} type="button">
        + {addLabel}
      </button>
      <p aria-live="polite" className="adm-sr-only">
        {announcement}
      </p>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="adm-row">{children}</div>;
}
