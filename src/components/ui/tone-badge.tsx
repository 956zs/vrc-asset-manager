import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ToneBadgeTone = "neutral" | "success" | "warning" | "danger";
type ToneBadgeProps = ComponentProps<typeof Badge> & {
  tone?: ToneBadgeTone;
};

const toneClasses: Record<ToneBadgeTone, string> = {
  neutral: "border-border/70 text-muted-foreground",
  success: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/70 bg-amber-500/10 text-amber-300",
  danger: "",
};

function ToneBadge({
  className,
  tone = "neutral",
  variant,
  ...props
}: ToneBadgeProps) {
  return (
    <Badge
      variant={variant ?? (tone === "danger" ? "destructive" : "outline")}
      className={cn(
        "h-5 px-1.5 text-[11px] leading-none",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

export { ToneBadge, type ToneBadgeTone };
