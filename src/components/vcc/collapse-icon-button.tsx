import { DisclosureChevron } from "@/components/ui/disclosure";
import { IconButton } from "@/components/ui/icon-button";
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
    <IconButton
      className={cn("!size-8", className)}
      aria-expanded={!collapsed}
      label={label}
      icon={<DisclosureChevron expanded={!collapsed} />}
      onClick={onClick}
    />
  );
}
