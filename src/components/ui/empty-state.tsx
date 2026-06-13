import type { ReactNode } from "react";

import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";

type EmptyStateTone = "default" | "success";

type EmptyStateProps = {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon?: ReactNode;
  iconClassName?: string;
  tone?: EmptyStateTone;
  title: ReactNode;
};

const toneClassNames: Record<EmptyStateTone, string> = {
  default: "",
  success: "border-primary/30 border-solid",
};

const iconToneClassNames: Record<EmptyStateTone, string> = {
  default: "",
  success: "bg-primary/10 text-primary",
};

function EmptyState({
  action,
  className,
  description,
  icon,
  iconClassName,
  tone = "default",
  title,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-lg border border-dashed border-border bg-card p-8 text-center text-card-foreground shadow-sm",
        toneClassNames[tone],
        className,
      )}
    >
      <div className="max-w-sm space-y-4">
        {icon && (
          <IconTile
            size="lg"
            className={cn("mx-auto", iconToneClassNames[tone], iconClassName)}
          >
            {icon}
          </IconTile>
        )}
        <div>
          <p className="text-base font-semibold text-foreground">{title}</p>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

export { EmptyState };
