import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AssetDetailShellProps = {
  children: ReactNode;
  className?: string;
  editing?: boolean;
};

function AssetDetailShell({
  children,
  className,
  editing,
}: AssetDetailShellProps) {
  return (
    <aside
      className={cn(
        "asset-detail-panel flex h-full min-h-0 shrink-0 overflow-x-hidden border-l border-border bg-card",
        className,
      )}
      data-asset-detail-editing={editing ? "true" : undefined}
      style={{ width: "clamp(18rem, 34vw, 25rem)" }}
    >
      {children}
    </aside>
  );
}

export { AssetDetailShell };
