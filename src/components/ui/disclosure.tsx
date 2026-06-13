import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DisclosureChevronProps = ComponentProps<typeof ChevronDown> & {
  collapsedClassName?: string;
  expanded: boolean;
  expandedClassName?: string;
};

type DisclosureButtonProps = Omit<ComponentProps<typeof Button>, "children"> & {
  expanded: boolean;
  children: ReactNode;
  chevronClassName?: string;
};

function DisclosureChevron({
  className,
  collapsedClassName = "-rotate-90",
  expanded,
  expandedClassName,
  ...props
}: DisclosureChevronProps) {
  return (
    <ChevronDown
      className={cn(
        "h-4 w-4 transition-transform",
        className,
        expanded ? expandedClassName : collapsedClassName,
      )}
      {...props}
    />
  );
}

function DisclosureButton({
  children,
  chevronClassName,
  className,
  expanded,
  size = "sm",
  type = "button",
  variant = "ghost",
  ...props
}: DisclosureButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      className={className}
      {...props}
    >
      <DisclosureChevron expanded={expanded} className={chevronClassName} />
      {children}
    </Button>
  );
}

export { DisclosureButton, DisclosureChevron };
