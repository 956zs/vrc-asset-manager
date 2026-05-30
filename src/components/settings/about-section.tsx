import {
  Database,
  ExternalLink,
  Shapes,
  Tag,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import appIconUrl from "@/assets/app-icon.png";

type AboutSectionProps = {
  appName: string;
  appVersion: string | null;
  assetCount: number;
  modelCount: number;
  tagCount: number;
  onOpenReleases: () => void;
};

export function AboutSection({
  appName,
  appVersion,
  assetCount,
  modelCount,
  tagCount,
  onOpenReleases,
}: AboutSectionProps) {
  return (
    <section className="flex min-h-full overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <div className="grid w-full content-center gap-6 px-5 py-6 text-center">
        <div className="mx-auto flex size-20 items-center justify-center overflow-hidden rounded-[1.25rem] border border-border bg-background shadow-lg">
          <img
            src={appIconUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-semibold text-foreground">{appName}</h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline">{appVersion ? `v${appVersion}` : "版本未知"}</Badge>
            <span className="text-sm text-muted-foreground">本機素材管理工具</span>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-[680px] items-stretch gap-3 sm:grid-cols-3">
          <AboutMetric icon={Shapes} label="素材" value={assetCount} />
          <AboutMetric icon={User} label="模型" value={modelCount} />
          <AboutMetric icon={Tag} label="標籤" value={tagCount} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary">
            <Database className="h-3 w-3" />
            SQLite
          </Badge>
          <Badge variant="secondary">Tauri v2</Badge>
          <Badge variant="secondary">React</Badge>
        </div>

        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={onOpenReleases}>
            <ExternalLink className="h-4 w-4" />
            GitHub Releases
          </Button>
        </div>
      </div>
    </section>
  );
}

function AboutMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shapes;
  label: string;
  value: number;
}) {
  return (
    <div className="flex h-full min-h-[132px] flex-col justify-center rounded-lg border border-border bg-background px-4 py-4">
      <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
