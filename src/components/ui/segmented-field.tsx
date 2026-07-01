import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

type SegmentedFieldOption<TValue extends string> = {
  value: TValue;
  label: string;
  tone?: "danger";
};

type SegmentedControlVariant = "subtle" | "solid";

type SegmentedControlProps<TValue extends string> = {
  className?: string;
  options: readonly SegmentedFieldOption<TValue>[];
  value: TValue;
  variant?: SegmentedControlVariant;
  onChange: (value: TValue) => void;
};

type SegmentedFieldProps<TValue extends string> = {
  label: string;
  help?: string;
  value: TValue;
  options: readonly SegmentedFieldOption<TValue>[];
  onChange: (value: TValue) => void;
};

function segmentedButtonClass(
  selected: boolean,
  dangerSelected: boolean,
  variant: SegmentedControlVariant,
) {
  if (!selected) {
    return "text-muted-foreground hover:bg-muted/40 hover:text-foreground";
  }

  if (dangerSelected) {
    return "bg-amber-500/18 text-amber-200 ring-1 ring-amber-500/55";
  }

  if (variant === "solid") {
    return "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground";
  }

  return "bg-primary/18 text-foreground ring-1 ring-primary/45";
}

export function SegmentedControl<TValue extends string>({
  className,
  options,
  value,
  variant = "subtle",
  onChange,
}: SegmentedControlProps<TValue>) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-1 rounded-md border border-border/80 bg-background/35 p-1",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const dangerSelected = selected && option.tone === "danger";

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            className={cn(
              "h-8 min-w-0 rounded-sm px-2 text-xs font-semibold leading-none transition-colors",
              segmentedButtonClass(selected, dangerSelected, variant),
            )}
            onClick={() => onChange(option.value)}
          >
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedField<TValue extends string>({
  label,
  help,
  value,
  options,
  onChange,
}: SegmentedFieldProps<TValue>) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/70">
        <span>{label}</span>
        {help && (
          <button
            type="button"
            aria-label={`${label}說明：${help}`}
            title={help}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <SegmentedControl options={options} value={value} onChange={onChange} />
    </div>
  );
}
