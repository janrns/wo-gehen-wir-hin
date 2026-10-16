interface ChipsProps<T> {
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
  single?: boolean;
}

export function Chips<T extends string | number>({ options, selected, onChange, single }: ChipsProps<T>) {
  function toggle(value: T) {
    if (single) return onChange([value]);
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="chip"
          aria-pressed={selected.includes(o.value)}
          onClick={() => toggle(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
