import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormFieldProps = {
  children: ReactNode;
  className?: string;
  label: ReactNode;
  labelClassName?: string;
  variant?: "default" | "compact" | "dialog";
};

const labelVariantClasses: Record<NonNullable<FormFieldProps["variant"]>, string> = {
  default: "text-sm font-semibold text-foreground/90",
  compact: "text-xs font-medium text-muted-foreground",
  dialog: "text-sm font-medium",
};

function FormField({
  children,
  className,
  label,
  labelClassName,
  variant = "default",
}: FormFieldProps) {
  return (
    <div className={cn(variant === "compact" ? "space-y-1.5" : "space-y-2", className)}>
      <label className={cn(labelVariantClasses[variant], labelClassName)}>
        {label}
      </label>
      {children}
    </div>
  );
}

export { FormField };
