import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CollapseIconButtonProps = {
  collapsed: boolean;
  collapsedLabel: string;
  expandedLabel: string;
  onClick: () => void;
  className?: string;
};

export function CollapseIconButton({
  collapsed,
  collapsedLabel,
  expandedLabel,
  onClick,
  className,
}: CollapseIconButtonProps) {
  const label = collapsed ? collapsedLabel : expandedLabel;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("!size-8", className)}
      aria-expanded={!collapsed}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <ChevronDown
        className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")}
      />
    </Button>
  );
}
