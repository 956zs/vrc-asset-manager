import { useEffect, useState } from "react";
import "./App.css";
import { Boxes, Images, Keyboard, Settings } from "lucide-react";
import { AddAssetDialog } from "@/components/add-asset-dialog";
import { AddModelDialog } from "@/components/add-model-dialog";
import { AddTagDialog } from "@/components/add-tag-dialog";
import { AppContextMenu } from "@/components/app-context-menu";
import { AppSettingsDialog } from "@/components/app-settings-dialog";
import { AssetDetail } from "@/components/asset-detail";
import { AssetGrid } from "@/components/asset-grid";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { AssetRelatedDialog } from "@/components/asset-related-dialog";
import { Sidebar } from "@/components/sidebar";
import { ShortcutHelpDialog } from "@/components/shortcuts/shortcut-help-dialog";
import { useAppShortcuts } from "@/components/shortcuts/use-app-shortcuts";
import { Button } from "@/components/ui/button";
import { VccProjects } from "@/components/vcc-projects";
import { useAssetStore } from "@/stores/asset-store";

type MainView = "assets" | "vcc";

function App() {
  const loadAll = useAssetStore((state) => state.loadAll);
  const selectedAssetId = useAssetStore((state) => state.selectedAssetId);
  const error = useAssetStore((state) => state.error);
  const notice = useAssetStore((state) => state.notice);
  const clearError = useAssetStore((state) => state.clearError);
  const clearNotice = useAssetStore((state) => state.clearNotice);
  const [mainView, setMainView] = useState<MainView>("assets");
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useAppShortcuts({
    isAssetView: mainView === "assets",
    showAssets: () => setMainView("assets"),
    showVcc: () => setMainView("vcc"),
    openCommandPalette: () => setIsCommandPaletteOpen(true),
    openHelp: () => setIsShortcutHelpOpen(true),
  });

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
      <Sidebar />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {mainView === "assets" ? "素材庫" : "VCC 專案"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {mainView === "assets" ? "管理你的 VRChat 素材" : "VPM 套件快照"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="快捷鍵"
              aria-label="快捷鍵"
              onClick={() => setIsShortcutHelpOpen(true)}
            >
              <Keyboard className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="設定 / 關於"
              aria-label="設定 / 關於"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={mainView === "assets" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMainView("assets")}
            >
              <Images className="h-4 w-4" />
              素材庫
            </Button>
            <Button
              type="button"
              variant={mainView === "vcc" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMainView("vcc")}
            >
              <Boxes className="h-4 w-4" />
              VCC
            </Button>
          </div>
        </header>
        {mainView === "assets" ? <AssetGrid /> : <VccProjects />}
      </main>

      {mainView === "assets" && selectedAssetId !== null && <AssetDetail />}

      <AddAssetDialog />
      <AddModelDialog />
      <AddTagDialog />
      <AssetRelatedDialog />
      <ShortcutHelpDialog
        open={isShortcutHelpOpen}
        onOpenChange={setIsShortcutHelpOpen}
      />
      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        showAssets={() => setMainView("assets")}
        showVcc={() => setMainView("vcc")}
      />
      <AppSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        showAssets={() => setMainView("assets")}
      />

      {error && (
        <div className="fixed bottom-4 left-1/2 z-50 flex max-w-[520px] -translate-x-1/2 items-center gap-3 rounded-md border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive shadow-lg">
          <span className="min-w-0 flex-1">{error}</span>
          <Button type="button" variant="ghost" size="sm" onClick={clearError}>
            關閉
          </Button>
        </div>
      )}

      {!error && notice && (
        <div className="fixed bottom-4 left-1/2 z-50 flex max-w-[520px] -translate-x-1/2 items-center gap-3 rounded-md border border-primary/30 bg-card px-4 py-3 text-sm text-foreground shadow-lg">
          <span className="min-w-0 flex-1">{notice}</span>
          <Button type="button" variant="ghost" size="sm" onClick={clearNotice}>
            關閉
          </Button>
        </div>
      )}

      <AppContextMenu />
    </div>
  );
}

export default App;
