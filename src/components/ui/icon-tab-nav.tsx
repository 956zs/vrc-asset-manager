import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type IconTabNavItem<TValue extends string> = {
  icon: LucideIcon;
  itemClassName?: string;
  label: string;
  value: TValue;
};

type IconTabNavProps<TValue extends string> = {
  className?: string;
  itemClassName?: string;
  items: readonly IconTabNavItem<TValue>[];
  value: TValue;
  onValueChange: (value: TValue) => void;
};

function IconTabNav<TValue extends string>({
  className,
  itemClassName,
  items,
  value,
  onValueChange,
}: IconTabNavProps<TValue>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex w-full max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const selected = value === item.value;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(
              "flex h-8 min-w-[104px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm text-muted-foreground transition-colors",
              selected && "bg-background text-foreground shadow-sm",
              itemClassName,
              item.itemClassName,
            )}
            onClick={() => onValueChange(item.value)}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export { IconTabNav, type IconTabNavItem };
