import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ShortcutHelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const shortcutGroups = [
  {
    title: "全域",
    shortcuts: [
      { keys: ["Ctrl", "/"], label: "顯示快捷鍵" },
      { keys: ["Ctrl", "K"], label: "快速搜尋" },
      { keys: ["Ctrl", "1"], label: "切換到素材庫" },
      { keys: ["Ctrl", "2"], label: "切換到 VCC" },
      { keys: ["Ctrl", "F"], label: "搜尋素材" },
      { keys: ["Esc"], label: "關閉素材詳情" },
    ],
  },
  {
    title: "新增",
    shortcuts: [
      { keys: ["Ctrl", "N"], label: "新增素材" },
      { keys: ["Ctrl", "Shift", "M"], label: "新增模型" },
      { keys: ["Ctrl", "Shift", "T"], label: "新增標籤" },
    ],
  },
  {
    title: "目前素材",
    shortcuts: [
      { keys: ["Ctrl", "E"], label: "編輯目前素材" },
      { keys: ["Ctrl", "O"], label: "開啟素材位置" },
      { keys: ["Ctrl", "Shift", "F"], label: "尋找相關素材" },
      { keys: ["Ctrl", "S"], label: "儲存編輯" },
      { keys: ["Esc"], label: "取消編輯" },
    ],
  },
];

export function ShortcutHelpDialog({
  open,
  onOpenChange,
}: ShortcutHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>快捷鍵</DialogTitle>
          <DialogDescription>常用操作可以直接用鍵盤完成</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {shortcutGroups.map((group) => (
            <section key={group.title} className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">{group.title}</h3>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div key={`${group.title}-${shortcut.label}`} className="contents">
                    <div className="flex flex-wrap gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {shortcut.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
