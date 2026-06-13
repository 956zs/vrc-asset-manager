import {
  Database,
  ExternalLink,
  Shapes,
  Tag,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetaBadge } from "@/components/ui/meta-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
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
    <Panel className="flex min-h-full overflow-hidden">
      <div className="grid w-full content-center gap-6 px-5 py-6 text-center">
        <AboutHero appName={appName} appVersion={appVersion} />
        <AboutMetrics
          assetCount={assetCount}
          modelCount={modelCount}
          tagCount={tagCount}
        />
        <TechnologyBadges />
        <ReleaseButton onOpenReleases={onOpenReleases} />
      </div>
    </Panel>
  );
}

function AppIcon() {
  return (
    <div className="mx-auto flex size-20 items-center justify-center overflow-hidden rounded-[1.25rem] border border-border bg-background shadow-lg">
      <img
        src={appIconUrl}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function AboutHero({
  appName,
  appVersion,
}: Pick<AboutSectionProps, "appName" | "appVersion">) {
  return (
    <>
      <AppIcon />
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold text-foreground">{appName}</h3>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <MetaBadge>{appVersion ? `v${appVersion}` : "版本未知"}</MetaBadge>
          <span className="text-sm text-muted-foreground">本機素材管理工具</span>
        </div>
      </div>
    </>
  );
}

function AboutMetrics({
  assetCount,
  modelCount,
  tagCount,
}: Pick<AboutSectionProps, "assetCount" | "modelCount" | "tagCount">) {
  return (
    <div className="mx-auto grid w-full max-w-[680px] items-stretch gap-3 sm:grid-cols-3">
      <AboutMetric icon={Shapes} label="素材" value={assetCount} />
      <AboutMetric icon={User} label="模型" value={modelCount} />
      <AboutMetric icon={Tag} label="標籤" value={tagCount} />
    </div>
  );
}

function TechnologyBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <MetaBadge variant="secondary">
        <Database className="h-3 w-3" />
        SQLite
      </MetaBadge>
      <MetaBadge variant="secondary">Tauri v2</MetaBadge>
      <MetaBadge variant="secondary">React</MetaBadge>
    </div>
  );
}

function ReleaseButton({
  onOpenReleases,
}: Pick<AboutSectionProps, "onOpenReleases">) {
  return (
    <div className="flex justify-center">
      <Button type="button" variant="outline" onClick={onOpenReleases}>
        <ExternalLink className="h-4 w-4" />
        GitHub Releases
      </Button>
    </div>
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
    <MetricCard
      label={label}
      value={value}
      icon={<Icon className="h-5 w-5" />}
      iconPlacement="center"
      size="large"
    />
  );
}
