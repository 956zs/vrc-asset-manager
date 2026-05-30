import { useEffect, useState } from "react";
import "./App.css";
import { Boxes, Images } from "lucide-react";
import { AddAssetDialog } from "@/components/add-asset-dialog";
import { AddModelDialog } from "@/components/add-model-dialog";
import { AddTagDialog } from "@/components/add-tag-dialog";
import { AssetDetail } from "@/components/asset-detail";
import { AssetGrid } from "@/components/asset-grid";
import { Sidebar } from "@/components/sidebar";
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

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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
    </div>
  );
}

export default App;
