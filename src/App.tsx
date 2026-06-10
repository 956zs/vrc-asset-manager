import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import "./App.css";
import { Boxes, Images, Keyboard, MousePointer2, Settings, type LucideIcon } from "lucide-react";
import { AddAssetDialog } from "@/components/add-asset-dialog";
import { AddModelDialog } from "@/components/add-model-dialog";
import { AddTagDialog } from "@/components/add-tag-dialog";
import { AppContextMenu } from "@/components/app-context-menu";
import { AppSettingsDialog } from "@/components/app-settings-dialog";
import { AssetDetail } from "@/components/asset-detail";
import { AssetGrid } from "@/components/asset-grid";
import { BatchImportDialog } from "@/components/batch-import-dialog";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { AssetRelatedDialog } from "@/components/asset-related-dialog";
import { Sidebar } from "@/components/sidebar";
import { ShortcutHelpDialog } from "@/components/shortcuts/shortcut-help-dialog";
import { useAppShortcuts } from "@/components/shortcuts/use-app-shortcuts";
import { Button } from "@/components/ui/button";
import { isTauriRuntime } from "@/lib/tauri-runtime";
import { VccProjects } from "@/components/vcc-projects";
import { useAssetStore } from "@/stores/asset-store";

type MainView = "assets" | "vcc";

type AppController = {
  clearError: () => void;
  clearNotice: () => void;
  error: string | null;
  isCommandPaletteOpen: boolean;
  batchImportPaths: string[];
  isBatchImportOpen: boolean;
  isDraggingFiles: boolean;
  isSettingsOpen: boolean;
  isShortcutHelpOpen: boolean;
  mainView: MainView;
  notice: string | null;
  selectedAssetId: number | null;
  setIsCommandPaletteOpen: Dispatch<SetStateAction<boolean>>;
  setBatchImportPaths: Dispatch<SetStateAction<string[]>>;
  setIsBatchImportOpen: Dispatch<SetStateAction<boolean>>;
  setIsDraggingFiles: Dispatch<SetStateAction<boolean>>;
  setIsSettingsOpen: Dispatch<SetStateAction<boolean>>;
  setIsShortcutHelpOpen: Dispatch<SetStateAction<boolean>>;
  setMainView: Dispatch<SetStateAction<MainView>>;
};

function useAppController(): AppController {
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
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [batchImportPaths, setBatchImportPaths] = useState<string[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

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
  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let unlisten: (() => void) | null = null;
    void import("@tauri-apps/api/webview")
      .then(({ getCurrentWebview }) =>
        getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type === "enter" || event.payload.type === "over") {
            setIsDraggingFiles(true);
            return;
          }

          if (event.payload.type === "leave") {
            setIsDraggingFiles(false);
            return;
          }

          setIsDraggingFiles(false);
          if (event.payload.type !== "drop" || event.payload.paths.length === 0) {
            return;
          }

          setBatchImportPaths(event.payload.paths);
          setIsBatchImportOpen(true);
          setMainView("assets");
        }),
      )
      .then((handler) => {
        unlisten = handler;
      })
      .catch((error) => {
        console.warn("Failed to register Tauri drag/drop handler", error);
      });

    return () => {
      unlisten?.();
    };
  }, []);

  return {
    batchImportPaths, clearError, clearNotice, error, isBatchImportOpen, isDraggingFiles,
    isCommandPaletteOpen, isSettingsOpen,
    isShortcutHelpOpen, mainView, notice, selectedAssetId,
    setBatchImportPaths, setIsBatchImportOpen, setIsCommandPaletteOpen, setIsDraggingFiles,
    setIsSettingsOpen, setIsShortcutHelpOpen, setMainView,
  };
}

function DesktopOnlyScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="max-w-md space-y-3 rounded-md border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold">請使用桌面版啟動</h1>
        <p className="text-sm text-muted-foreground">
          VRC Asset Manager 需要 Tauri 桌面環境來讀寫本機檔案。請使用 `npm run demo`
          或桌面版應用程式開啟。
        </p>
      </div>
    </div>
  );
}

function ViewTitle({ mainView }: { mainView: MainView }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">
        {mainView === "assets" ? "素材庫" : "VCC 專案"}
      </h2>
      <p className="text-xs text-muted-foreground">
        {mainView === "assets" ? "管理你的 VRChat 素材" : "VPM 套件快照"}
      </p>
    </div>
  );
}

function HeaderIconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="ghost" size="icon" title={label} aria-label={label} onClick={onClick}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function MainViewButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant={active ? "secondary" : "ghost"} size="sm" onClick={onClick}>
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

function AppHeader({ controller }: { controller: AppController }) {
  return (
    <header className="flex h-14 min-w-0 shrink-0 items-center justify-between gap-3 overflow-hidden border-b border-border px-4">
      <ViewTitle mainView={controller.mainView} />
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <HeaderIconButton
          icon={Keyboard}
          label="快捷鍵"
          onClick={() => controller.setIsShortcutHelpOpen(true)}
        />
        <HeaderIconButton
          icon={Settings}
          label="設定 / 關於"
          onClick={() => controller.setIsSettingsOpen(true)}
        />
        <MainViewButton
          active={controller.mainView === "assets"}
          icon={Images}
          label="素材庫"
          onClick={() => controller.setMainView("assets")}
        />
        <MainViewButton
          active={controller.mainView === "vcc"}
          icon={Boxes}
          label="VCC"
          onClick={() => controller.setMainView("vcc")}
        />
      </div>
    </header>
  );
}

function MainPanel({ controller }: { controller: AppController }) {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <AppHeader controller={controller} />
      {controller.mainView === "assets" ? <AssetGrid /> : <VccProjects />}
    </main>
  );
}

function AppDialogs({ controller }: { controller: AppController }) {
  return (
    <>
      <AddAssetDialog />
      <AddModelDialog />
      <AddTagDialog />
      <AssetRelatedDialog />
      <ShortcutHelpDialog
        open={controller.isShortcutHelpOpen}
        onOpenChange={controller.setIsShortcutHelpOpen}
      />
      <CommandPalette
        open={controller.isCommandPaletteOpen}
        onOpenChange={controller.setIsCommandPaletteOpen}
        showAssets={() => controller.setMainView("assets")}
        showVcc={() => controller.setMainView("vcc")}
      />
      <AppSettingsDialog
        open={controller.isSettingsOpen}
        onOpenChange={controller.setIsSettingsOpen}
        showAssets={() => controller.setMainView("assets")}
      />
      <BatchImportDialog
        open={controller.isBatchImportOpen}
        paths={controller.batchImportPaths}
        onOpenChange={controller.setIsBatchImportOpen}
      />
    </>
  );
}

function AppToast({
  message,
  tone,
  onClose,
}: {
  message: string;
  tone: "error" | "notice";
  onClose: () => void;
}) {
  return (
    <div className={`fixed bottom-4 left-1/2 z-50 flex max-w-[520px] -translate-x-1/2 items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm shadow-lg ${tone === "error" ? "border-destructive/30 text-destructive" : "border-primary/30 text-foreground"}`}>
      <span className="min-w-0 flex-1">{message}</span>
      <Button type="button" variant="ghost" size="sm" onClick={onClose}>
        關閉
      </Button>
    </div>
  );
}

function AppNotifications({ controller }: { controller: AppController }) {
  if (controller.error) {
    return (
      <AppToast message={controller.error} tone="error" onClose={controller.clearError} />
    );
  }
  if (controller.notice) {
    return (
      <AppToast message={controller.notice} tone="notice" onClose={controller.clearNotice} />
    );
  }
  return null;
}

function DragImportOverlay({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
      <div className="grid min-h-[240px] w-[min(520px,calc(100vw-3rem))] place-items-center rounded-lg border-2 border-dashed border-primary bg-card/95 p-8 text-center text-card-foreground shadow-2xl animate-in fade-in-0 zoom-in-95">
        <div className="space-y-4">
          <div className="mx-auto flex size-14 animate-pulse items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MousePointer2 className="h-7 w-7" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">拖曳到這裡</p>
            <p className="mt-2 text-sm text-muted-foreground">
              放開後會開啟批次導入確認
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppShell({ controller }: { controller: AppController }) {
  return (
    <div className="app-shell flex h-screen min-h-0 w-screen max-w-full overflow-hidden bg-background">
      <Sidebar />
      <MainPanel controller={controller} />
      {controller.mainView === "assets" && controller.selectedAssetId !== null && (
        <AssetDetail />
      )}
      <AppDialogs controller={controller} />
      <AppNotifications controller={controller} />
      <DragImportOverlay visible={controller.isDraggingFiles} />
      <AppContextMenu />
    </div>
  );
}

function DesktopApp() {
  return <AppShell controller={useAppController()} />;
}

function App() {
  if (!isTauriRuntime()) {
    return <DesktopOnlyScreen />;
  }

  return <DesktopApp />;
}

export default App;
