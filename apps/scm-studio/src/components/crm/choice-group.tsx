// Auswahl aus wenigen Werten als Segmente (Radio-Gruppe im Stil des iOS-Segmented-Control).
// Funktioniert ohne JavaScript; für abhängige Felder optional mit onChange.
import { cn } from "@/lib/cn";

export function ChoiceGroup({
  name,
  legend,
  options,
  defaultValue,
  value,
  onChange,
  className,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <fieldset className={cn("grid min-w-0 gap-1.5", className)}>
      <legend className="mb-1.5 text-[13px] font-medium text-ink-2">{legend}</legend>
      {/* Handy: ab 4 Werten zwei Spalten (wie die Terminart im Kalender), damit nichts abgeschnitten wird */}
      <div className={cn("gap-[2px] rounded-[10px] bg-fill p-[2px] sm:inline-flex sm:w-max", options.length > 3 ? "grid grid-cols-2" : "flex")}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-[8px] px-3 text-center text-[15px] font-medium text-ink transition-[background-color,box-shadow] duration-200 sm:h-8 sm:flex-none sm:text-[13px]",
              "has-[:checked]:bg-surface has-[:checked]:font-semibold has-[:checked]:shadow-[var(--shadow-thumb)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              className="sr-only"
              {...(value !== undefined ? { checked: value === o.value } : { defaultChecked: defaultValue === o.value })}
              onChange={onChange ? () => onChange(o.value) : undefined}
            />
            <span className="truncate">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
