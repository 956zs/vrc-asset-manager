import { useEffect, useState } from "react";
import { FolderCog, Save } from "lucide-react";
import { LibraryRootActions } from "@/components/library-root-actions";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { MonoText } from "@/components/ui/mono-text";
import { Panel } from "@/components/ui/panel";
import { SurfaceBox } from "@/components/ui/surface-box";
import { MetaBadge } from "@/components/ui/meta-badge";
import { useAssetStore } from "@/stores/asset-store";
import type { LibrarySettings } from "@/types";
import { SettingsSection } from "./settings-section";

type LibraryFolderDraft = {
  avatarFolder: string;
  accessoryFolder: string;
  worldFolder: string;
};

const defaultDraft: LibraryFolderDraft = {
  avatarFolder: "素體",
  accessoryFolder: "素體配件",
  worldFolder: "世界",
};

function draftFromSettings(settings: LibrarySettings | null): LibraryFolderDraft {
  if (!settings) {
    return defaultDraft;
  }

  return {
    avatarFolder: settings.avatarFolder,
    accessoryFolder: settings.accessoryFolder,
    worldFolder: settings.worldFolder,
  };
}

export function LibrarySection() {
  const librarySettings = useAssetStore((state) => state.librarySettings);
  const updateLibrarySettings = useAssetStore((state) => state.updateLibrarySettings);
  const saving = useAssetStore((state) => state.saving);
  const [draft, setDraft] = useState<LibraryFolderDraft>(() =>
    draftFromSettings(librarySettings),
  );

  useEffect(() => {
    setDraft(draftFromSettings(librarySettings));
  }, [librarySettings]);

  const dirty =
    draft.avatarFolder !== (librarySettings?.avatarFolder ?? defaultDraft.avatarFolder) ||
    draft.accessoryFolder !==
      (librarySettings?.accessoryFolder ?? defaultDraft.accessoryFolder) ||
    draft.worldFolder !== (librarySettings?.worldFolder ?? defaultDraft.worldFolder);
  const save = async () => {
    await updateLibrarySettings({
      rootPath: librarySettings?.rootPath ?? null,
      avatarFolder: draft.avatarFolder,
      accessoryFolder: draft.accessoryFolder,
      worldFolder: draft.worldFolder,
    });
  };

  return (
    <SettingsSection>
      <Panel className="p-5">
        <div className="flex min-w-0 items-start gap-3">
          <IconTile>
            <FolderCog className="h-5 w-5" />
          </IconTile>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">素材庫</h3>
              <MetaBadge variant={librarySettings?.rootPath ? "secondary" : "outline"}>
                {librarySettings?.rootPath ? "已設定" : "尚未設定"}
              </MetaBadge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              分類資料夾決定實體檔案位置；變更根目錄不會自動搬移既有素材。
            </p>
          </div>
        </div>
        <div className="mt-4">
          <LibraryRootActions />
        </div>
      </Panel>
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">分類資料夾名稱</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              內部分類固定，右側名稱是實際建立在素材庫中的資料夾名稱。
            </p>
          </div>
          <Button type="button" disabled={!dirty || saving} onClick={() => void save()}>
            <Save className="h-4 w-4" />
            儲存名稱
          </Button>
        </div>
        <div className="mt-4 grid gap-3">
          <FolderNameRow
            label="avatar"
            description="素體"
            value={draft.avatarFolder}
            onChange={(avatarFolder) => setDraft((current) => ({ ...current, avatarFolder }))}
          />
          <FolderNameRow
            label="accessory"
            description="素體配件"
            value={draft.accessoryFolder}
            onChange={(accessoryFolder) =>
              setDraft((current) => ({ ...current, accessoryFolder }))
            }
          />
          <FolderNameRow
            label="world"
            description="世界"
            value={draft.worldFolder}
            onChange={(worldFolder) => setDraft((current) => ({ ...current, worldFolder }))}
          />
        </div>
        {librarySettings?.rootPath && dirty && (
          <p className="mt-3 text-xs text-muted-foreground">
            儲存後會建立新名稱資料夾；既有素材檔案不會自動搬移。
          </p>
        )}
      </Panel>
    </SettingsSection>
  );
}

function FolderNameRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SurfaceBox className="grid items-center gap-3 bg-background/60 p-3 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)]">
      <div className="min-w-0">
        <MonoText>{label}</MonoText>
        <p className="mt-1 text-sm font-medium text-foreground">{description}</p>
      </div>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </SurfaceBox>
  );
}
