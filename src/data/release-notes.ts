export type ReleaseNoteSectionKey =
  | "features"
  | "improvements"
  | "fixes"
  | "breakingChanges";

export type ReleaseNoteInlineNode =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "highlight"; text: string }
  | { type: "code"; text: string };

export type ReleaseNoteItem = {
  key: string;
  nodes: ReleaseNoteInlineNode[];
};

export type ReleaseNote = {
  version: string;
  date: string;
  title: string;
  summaryNodes: ReleaseNoteInlineNode[];
  features: ReleaseNoteItem[];
  improvements: ReleaseNoteItem[];
  fixes: ReleaseNoteItem[];
  breakingChanges: ReleaseNoteItem[];
};

type ParsedVersion = {
  core: number[];
  prerelease: string[];
};

const prereleaseRank: Record<string, number> = {
  dev: 0,
  alpha: 1,
  beta: 2,
  preview: 2,
  rc: 3,
};

function text(text: string): ReleaseNoteInlineNode {
  return { type: "text", text };
}

function strong(text: string): ReleaseNoteInlineNode {
  return { type: "strong", text };
}

function highlight(text: string): ReleaseNoteInlineNode {
  return { type: "highlight", text };
}

function code(text: string): ReleaseNoteInlineNode {
  return { type: "code", text };
}

function nodes(...parts: ReleaseNoteInlineNode[]) {
  return parts;
}

function item(key: string, itemNodes: ReleaseNoteInlineNode[]): ReleaseNoteItem {
  return { key, nodes: itemNodes };
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: "0.2.0-beta.5",
    date: "2026-07-01",
    title: "導入診斷與更新安裝",
    summaryNodes: nodes(
      text("這版讓 "),
      strong("批次導入"),
      text(" 的失敗原因更容易判斷，也補強 "),
      strong("BOOTH"),
      text(" 建議與 "),
      highlight("更新安裝後重啟"),
      text("。"),
    ),
    features: [
      item("beta5-feature-1", nodes(text("批次導入結果現在會標示失敗階段，區分預檢、檔案處理與資料庫記錄失敗，排查問題更快。"))),
      item("beta5-feature-2", nodes(text("若檔案已移入素材庫但資料庫記錄建立失敗，報告會保留目標位置並提示先手動確認檔案，再重新建立素材記錄。"))),
      item("beta5-feature-3", nodes(text("更新下載並安裝完成後，設定的更新頁會顯示「立即重啟」，可以直接重新啟動 app 讓新版生效。"))),
    ],
    improvements: [
      item("beta5-improvement-1", nodes(text("拖入 URL、一般單檔、"), code(".7z"), text(" 或 "), code(".rar"), text(" 時，批次導入會顯示更明確的不支援原因與目前支援的來源格式。"))),
      item("beta5-improvement-2", nodes(text("BOOTH 資訊解析會合併 JSON-LD、meta 與頁面描述，減少支援模型、變體名稱或商品描述被單一來源覆蓋的情況。"))),
      item("beta5-improvement-3", nodes(text("BOOTH 建議模型與標籤擴充了常見別名，包含「ちゃん」模型稱呼、衣裝、洋服、ヘア、メイク、Body Texture 與 Props 等描述。"))),
      item("beta5-improvement-4", nodes(text("發佈流程會在上傳前檢查安裝檔、簽章與 "), code("latest.json"), text("，確認版本、簽章與 GitHub Release URL 彼此一致。"))),
      item("beta5-improvement-5", nodes(text("內建更新內容改為直接打包在 TypeScript 資料中，少了一層 Markdown 解析流程，降低 release notes 載入出錯的機會。"))),
    ],
    fixes: [
      item("beta5-fix-1", nodes(text("BOOTH 商品描述不再只取最長的一段文字，避免商品頁 body 或 JSON-LD 中的支援模型清單被忽略。"))),
      item("beta5-fix-2", nodes(text("解壓縮匯入現在會在結果中顯示為「解壓」，不再只用移動或複製描述實際操作。"))),
    ],
    breakingChanges: [
      item("beta5-note-1", nodes(text("目前批次導入仍只支援資料夾、"), code(".zip"), text(" 與 "), code(".unitypackage"), text("；"), code(".7z"), text("、"), code(".rar"), text(" 與一般單檔會被預檢擋下。"))),
      item("beta5-note-2", nodes(text("使用 GitHub "), code("/releases/latest"), text(" 的更新端點時，beta / RC prerelease 不會被穩定版更新通道自動送出。"))),
    ],
  },
  {
    version: "0.2.0-beta.4",
    date: "2026-06-14",
    title: "BOOTH Shop 整理",
    summaryNodes: nodes(
      text("這版讓 "),
      strong("BOOTH Shop"),
      text(" 成為素材資料的一部分，可以抓取、編輯、搜尋與篩選賣家資訊，也能 "),
      highlight("補齊既有素材的 Shop 資料"),
      text("。"),
    ),
    features: [
      item("beta4-feature-1", nodes(
        text("素材現在可以保存 "),
        strong("BOOTH Shop 名稱"),
        text("與 "),
        strong("Shop URL"),
        text("，並在新增、批次導入與素材詳情中直接查看或編輯。"),
      )),
      item("beta4-feature-2", nodes(text("從 BOOTH 連結「抓取資訊」時，會一併帶入商品標題、縮圖、建議模型、建議標籤與 Shop 資訊。"))),
      item("beta4-feature-3", nodes(text("側邊欄新增「依 BOOTH Shop 篩選」，可以依賣家快速縮小素材清單。"))),
      item("beta4-feature-4", nodes(text("側邊欄新增「補齊既有素材」，會從已有 BOOTH 連結回填缺少的 Shop 名稱與 URL，並顯示更新、略過與失敗數量。"))),
    ],
    improvements: [
      item("beta4-improvement-1", nodes(text("搜尋素材時會納入 BOOTH Shop 名稱與 Shop URL，找賣家或商店網址更直覺。"))),
      item("beta4-improvement-2", nodes(text("素材詳情的 BOOTH 區塊會顯示商品連結與 Shop 連結，未編輯時也能直接開啟。"))),
      item("beta4-improvement-3", nodes(text("匯出與匯入存檔會保留 BOOTH Shop 資訊，舊版存檔仍可照常匯入。"))),
      item("beta4-improvement-4", nodes(text("新增與批次導入流程整理了補充資料、建議標籤、建議模型與來源內容列表，操作狀態更容易掃讀。"))),
      item("beta4-improvement-5", nodes(text("側邊欄篩選、進階篩選與拖曳排序的互動拆分後更穩定，篩選摘要會固定保留位置，畫面比較不會跳動。"))),
    ],
    fixes: [
      item("beta4-fix-1", nodes(text("BOOTH 資訊解析現在會從 JSON-LD、頁面連結或 Shop 子網域推回 Shop URL，減少只抓到商品但缺少賣家網址的情況。"))),
      item("beta4-fix-2", nodes(text("回填既有素材時會把空白 Shop 欄位視為缺資料，不會因為空字串而略過可補齊的項目。"))),
    ],
    breakingChanges: [
      item("beta4-note-1", nodes(text("「補齊既有素材」會逐筆讀取 BOOTH 商品頁；若頁面無法讀取、商品不存在或網路失敗，該筆會被列入略過或失敗。"))),
      item("beta4-note-2", nodes(text("首次啟動新版時會自動為素材庫加入 BOOTH Shop 欄位，不需要手動搬移資料。"))),
    ],
  },
  {
    version: "0.2.0-beta.3",
    date: "2026-06-13",
    title: "內建更新內容",
    summaryNodes: nodes(
      text("這版加入 "),
      highlight("首次開啟更新內容"),
      text("，讓 app 更新後可以直接看到本版重點，也能從設定裡重新查看。"),
    ),
    features: [
      item("beta3-feature-1", nodes(text("更新到新版後，app 會自動顯示"), strong("更新內容"), text("視窗，列出還沒看過的 release notes。"))),
      item("beta3-feature-2", nodes(text("設定中心的"), strong("更新"), text("頁新增「查看更新內容」，可以隨時重新打開目前版本的說明。"))),
      item("beta3-feature-3", nodes(text("Release notes 會從 app 內建資料載入，支援新功能、改善、修正與需要注意等分類。"))),
    ],
    improvements: [
      item("beta3-improvement-1", nodes(text("已讀版本會保存在本機，下次開啟同一版本時不會重複打擾。"))),
      item("beta3-improvement-2", nodes(text("更新內容支援 "), code("code"), text("、"), strong("粗體"), text("與"), highlight("重點標示"), text("，讓重要資訊更容易掃讀。"))),
      item("beta3-improvement-3", nodes(text("在非桌面預覽環境中會使用最新內建 release note 版本，方便開發與檢查內容。"))),
    ],
    fixes: [],
    breakingChanges: [
      item("beta3-note-1", nodes(text("若某個版本沒有內建對應的 release note，手動查看本版更新內容時不會開啟視窗。"))),
    ],
  },
];

function parseVersion(version: string): ParsedVersion {
  const [coreText, prereleaseText = ""] = version.replace(/^v/i, "").split("-");
  return {
    core: coreText.split(".").map((part) => Number.parseInt(part, 10) || 0),
    prerelease: prereleaseText ? prereleaseText.split(".") : [],
  };
}

function comparePrereleasePart(first: string, second: string) {
  const firstNumber = Number.parseInt(first, 10);
  const secondNumber = Number.parseInt(second, 10);
  const firstIsNumber = String(firstNumber) === first;
  const secondIsNumber = String(secondNumber) === second;

  if (firstIsNumber && secondIsNumber) return firstNumber - secondNumber;
  if (firstIsNumber) return -1;
  if (secondIsNumber) return 1;

  const firstRank = prereleaseRank[first.toLowerCase()];
  const secondRank = prereleaseRank[second.toLowerCase()];
  if (firstRank !== undefined || secondRank !== undefined) {
    return (firstRank ?? 10) - (secondRank ?? 10);
  }

  return first.localeCompare(second);
}

export function compareVersions(firstVersion: string, secondVersion: string) {
  const first = parseVersion(firstVersion);
  const second = parseVersion(secondVersion);
  const coreLength = Math.max(first.core.length, second.core.length);

  for (let index = 0; index < coreLength; index += 1) {
    const diff = (first.core[index] ?? 0) - (second.core[index] ?? 0);
    if (diff !== 0) return diff;
  }

  if (first.prerelease.length === 0 && second.prerelease.length === 0) return 0;
  if (first.prerelease.length === 0) return 1;
  if (second.prerelease.length === 0) return -1;

  const prereleaseLength = Math.max(first.prerelease.length, second.prerelease.length);
  for (let index = 0; index < prereleaseLength; index += 1) {
    const firstPart = first.prerelease[index];
    const secondPart = second.prerelease[index];
    if (firstPart === undefined) return -1;
    if (secondPart === undefined) return 1;

    const diff = comparePrereleasePart(firstPart, secondPart);
    if (diff !== 0) return diff;
  }

  return 0;
}

export function getLatestReleaseNotesVersion() {
  return [...releaseNotes].sort((first, second) =>
    compareVersions(second.version, first.version),
  )[0]?.version ?? "0.0.0";
}

export function getReleaseNotesForVersion(version: string) {
  return releaseNotes.find((note) => compareVersions(note.version, version) === 0) ?? null;
}

export function getUnseenReleaseNotes(
  currentVersion: string,
  lastSeenVersion: string | null,
) {
  if (!lastSeenVersion) {
    const currentNote = getReleaseNotesForVersion(currentVersion);
    return currentNote ? [currentNote] : [];
  }

  if (compareVersions(currentVersion, lastSeenVersion) <= 0) {
    return [];
  }

  return releaseNotes
    .filter(
      (note) =>
        compareVersions(note.version, lastSeenVersion) > 0 &&
        compareVersions(note.version, currentVersion) <= 0,
    )
    .sort((first, second) => compareVersions(first.version, second.version));
}
