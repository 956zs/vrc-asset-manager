import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type PanelTone = "default" | "accent" | "warn";

type PanelProps = ComponentProps<"div"> & {
  as?: "article" | "div" | "section";
  tone?: PanelTone;
};

const toneClassNames: Record<PanelTone, string> = {
  default: "",
  accent: "border-primary/30",
  warn: "border-destructive/30",
};

function Panel({
  as: Component = "div",
  className,
  tone = "default",
  ...props
}: PanelProps) {
  return (
    <Component
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
        toneClassNames[tone],
        className,
      )}
      {...props}
    />
  );
}

export { Panel };
