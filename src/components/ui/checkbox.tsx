import type { InputHTMLAttributes } from "react";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  onCheckedChange?: (checked: boolean) => void;
};

function Checkbox({
  className,
  onChange,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  return (
    <span className="relative inline-flex size-4 shrink-0">
      <input
        type="checkbox"
        data-slot="checkbox"
        className={cn(
          "peer size-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border-2 border-muted-foreground/60 bg-background shadow-sm outline-none transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-px hover:border-primary hover:bg-primary/10 hover:ring-2 hover:ring-primary/25 checked:border-primary checked:bg-primary focus:border-primary focus:ring-[3px] focus:ring-primary/35 focus-visible:ring-[3px] focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:ring-0",
          className,
        )}
        onChange={(event) => {
          onChange?.(event);
          onCheckedChange?.(event.currentTarget.checked);
        }}
        {...props}
      />
      <CheckIcon
        aria-hidden="true"
        data-slot="checkbox-indicator"
        className="pointer-events-none absolute top-1/2 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 text-primary-foreground opacity-0 transition-none peer-checked:opacity-100"
      />
    </span>
  );
}

export { Checkbox };
