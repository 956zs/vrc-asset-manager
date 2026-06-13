import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock3,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  ReleaseNote,
  ReleaseNoteInlineNode,
  ReleaseNoteSectionKey,
} from "@/data/release-notes";

type ReleaseNotesDialogProps = {
  currentVersion: string;
  lastSeenVersion: string | null;
  notes: ReleaseNote[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => void;
};

type SectionConfig = {
  key: ReleaseNoteSectionKey;
  label: string;
  icon: LucideIcon;
};

const sectionConfigs: SectionConfig[] = [
  {
    key: "features",
    label: "新功能",
    icon: Sparkles,
  },
  {
    key: "improvements",
    label: "改善",
    icon: Wrench,
  },
  {
    key: "fixes",
    label: "修正",
    icon: Bug,
  },
  {
    key: "breakingChanges",
    label: "需要注意",
    icon: AlertTriangle,
  },
];

function InlineReleaseNoteText({ nodes }: { nodes: ReleaseNoteInlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        const key = `${node.type}-${index}-${node.text}`;
        if (node.type === "strong") {
          return (
            <strong key={key} className="font-semibold text-foreground">
              {node.text}
            </strong>
          );
        }
        if (node.type === "highlight") {
          return (
            <mark
              key={key}
              className="rounded-sm bg-primary/25 px-1 py-0.5 text-foreground ring-1 ring-primary/45"
            >
              {node.text}
            </mark>
          );
        }
        if (node.type === "code") {
          return (
            <code
              key={key}
              className="rounded-sm border border-white/15 bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
            >
              {node.text}
            </code>
          );
        }

        return <span key={key}>{node.text}</span>;
      })}
    </>
  );
}

// Layer 2 content block: do not add border/bg here; use separators and spacing
// so nested release note content does not turn back into another card.
function ReleaseNoteSection({
  note,
  config,
  isFirst,
}: {
  note: ReleaseNote;
  config: SectionConfig;
  isFirst: boolean;
}) {
  const items = note[config.key];
  if (items.length === 0) return null;

  const Icon = config.icon;

  return (
    <section className={isFirst ? "pb-4" : "border-t border-white/12 py-4"}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-foreground/70" />
        <h4 className="text-sm font-semibold text-foreground">{config.label}</h4>
      </div>
      <ul className="space-y-2 text-sm text-foreground/80">
        {items.map((item) => (
          <li key={item.key} className="grid grid-cols-[0.5rem_minmax(0,1fr)] gap-2">
            <span className="mt-2 size-1.5 rounded-full bg-primary/80" />
            <span className="min-w-0 leading-6">
              <InlineReleaseNoteText nodes={item.nodes} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReleaseNoteCard({ note }: { note: ReleaseNote }) {
  const visibleSections = sectionConfigs.filter((config) => note[config.key].length > 0);

  return (
    <article className="rounded-lg border border-white/14 bg-card text-card-foreground shadow-sm shadow-black/20">
      <div className="border-b border-white/12 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 text-base font-semibold text-foreground">{note.title}</h3>
          <Badge variant="outline">v{note.version}</Badge>
          <Badge variant="secondary">{note.date}</Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground/75">
          <InlineReleaseNoteText nodes={note.summaryNodes} />
        </p>
      </div>
      <div className="p-4">
        {visibleSections.map((config, index) => (
          <ReleaseNoteSection
            key={config.key}
            note={note}
            config={config}
            isFirst={index === 0}
          />
        ))}
      </div>
    </article>
  );
}

export function ReleaseNotesDialog({
  currentVersion,
  lastSeenVersion,
  notes,
  open,
  onOpenChange,
  onAcknowledge,
}: ReleaseNotesDialogProps) {
  return (
    <Dialog open={open && notes.length > 0} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-[760px]">
        <DialogHeader className="border-b border-white/14 px-5 py-4 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-7">
            <div className="min-w-0">
              <DialogTitle>更新內容</DialogTitle>
              <DialogDescription className="mt-2 text-foreground/75">
                已更新到 v{currentVersion}，以下是這次需要知道的變更。
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">目前 v{currentVersion}</Badge>
              {lastSeenVersion && (
                <Badge variant="secondary">上次已讀 v{lastSeenVersion}</Badge>
              )}
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="min-h-0 bg-muted/30">
          <div className="grid gap-4 p-5">
            {notes.map((note) => (
              <ReleaseNoteCard key={note.version} note={note} />
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="border-t border-white/14 bg-background px-5 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            <Clock3 className="h-4 w-4" />
            稍後再看
          </Button>
          <Button type="button" onClick={onAcknowledge}>
            <CheckCircle2 className="h-4 w-4" />
            知道了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
