import type { ComponentProps } from "react";

import { DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type DialogActionBarProps = ComponentProps<typeof DialogFooter> & {
  justify?: "end" | "between";
  layout?: "flush" | "inset";
};

function DialogActionBar({
  className,
  justify = "end",
  layout = "flush",
  ...props
}: DialogActionBarProps) {
  return (
    <DialogFooter
      className={cn(
        "sm:items-center",
        layout === "flush" && "border-t border-border bg-background px-6 py-4",
        layout === "inset" && "mt-2",
        justify === "between" && "sm:justify-between",
        className,
      )}
      {...props}
    />
  );
}

export { DialogActionBar };
