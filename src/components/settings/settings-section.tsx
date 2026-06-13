import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type SettingsSectionProps = ComponentProps<"section">;

function SettingsSection({ className, ...props }: SettingsSectionProps) {
  return (
    <section
      className={cn("flex min-h-full flex-col gap-4", className)}
      {...props}
    />
  );
}

export { SettingsSection };
