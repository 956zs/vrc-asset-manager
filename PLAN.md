# VRC Asset Manager — 專案計劃書 v1.0

---

## 1. 專案概述

VRC Asset Manager 是一款 Windows 桌面應用程式，旨在解決 VRChat 模型改造過程中素材管理混亂的問題。使用者在改造模型時需要用到大量素材（眼睛貼圖、頭髮、飾品等），每個素材可能有不同的模型相容限制，現有的資料夾結構無法有效表達這些關係，導致檢索困難。

本應用以索引 + 標籤系統為核心，讓使用者可以快速篩選出特定模型可用的素材，並直接開啟對應的檔案或 Booth 商品頁面。

**核心目標：**

- 以索引取代手動瀏覽——不再歷遍每個部位資料夾
- 模型 ↔ 素材 多對多關係管理
- 標籤分類 + AND 篩選邏輯，快速縮小結果
- 自動抓取 Booth 商品縮圖，視覺化素材庫
- 檔案路徑失效即時警告

---

## 2. 技術架構

### 2.1 Tech Stack

| 層級 | 技術 | 說明 |
|------|------|------|
| Frontend | React + TypeScript | UI 介面，檔案總管風格 |
| Desktop Shell | Tauri v2 | Windows 應用封裝 |
| Backend Logic | Rust | 檔案操作、HTTP 請求、DB 存取 |
| Database | SQLite | 本地資料儲存，透過 tauri-plugin-sql |
| HTTP Client | reqwest (Rust) | 抓取 Booth OG image |
| Styling | Tailwind CSS | 快速 UI 樣式 |
| State Management | Zustand | 前端篩選狀態管理 |

### 2.2 資料夾結構

```
vrc-asset-manager/
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── db.rs               # SQLite 連線與 migration
│   │   ├── commands/           # Tauri invoke commands
│   │   │   ├── assets.rs
│   │   │   ├── models.rs
│   │   │   ├── tags.rs
│   │   │   └── booth.rs        # OG image 抓取
│   │   └── types.rs
│   └── Cargo.toml
└── src/                        # React frontend
    ├── components/
    │   ├── Sidebar.tsx
    │   ├── AssetGrid.tsx
    │   ├── AssetCard.tsx
    │   └── AssetDetail.tsx
    ├── hooks/
    ├── stores/                 # Zustand
    └── types/
```

---

## 3. 資料庫設計

### 3.1 ER 關係

```
Models  ──< AssetModels >──  Assets  ──< AssetTags >──  Tags
```

Assets 為核心實體，與 Models、Tags 各自形成多對多關係，透過中介表連接。

### 3.2 Schema Migration

> 儲存為 `src-tauri/migrations/001_initial.sql`

```sql
-- models
CREATE TABLE IF NOT EXISTS models (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    display_name TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- tags
CREATE TABLE IF NOT EXISTS tags (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL UNIQUE,
    color TEXT    NOT NULL DEFAULT '#6B7280'
);

-- assets
CREATE TABLE IF NOT EXISTS assets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    display_name  TEXT,
    file_path     TEXT    NOT NULL,
    booth_url     TEXT,
    thumbnail_url TEXT,
    note          TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 中介表：asset ↔ model
CREATE TABLE IF NOT EXISTS asset_models (
    asset_id  INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    model_id  INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, model_id)
);

-- 中介表：asset ↔ tag
CREATE TABLE IF NOT EXISTS asset_tags (
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
    PRIMARY KEY (asset_id, tag_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_asset_models_model ON asset_models(model_id);
CREATE INDEX IF NOT EXISTS idx_asset_models_asset ON asset_models(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag     ON asset_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_asset   ON asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_file_path   ON assets(file_path);
```

### 3.3 欄位說明

| Table | 欄位 | 型別 | 說明 |
|-------|------|------|------|
| assets | name | TEXT | 原始檔案名稱（自動從路徑解析） |
| assets | display_name | TEXT | 使用者自訂易讀名稱（選填） |
| assets | file_path | TEXT | 本機絕對路徑 |
| assets | booth_url | TEXT | Booth 商品頁面 URL（選填） |
| assets | thumbnail_url | TEXT | OG image URL 或 local cache 路徑 |
| assets | note | TEXT | 備註欄位（選填） |
| models | display_name | TEXT | 使用者自訂模型名稱（選填） |
| tags | color | TEXT | Hex 色碼，用於前端 tag chip 顯示 |
| asset_models | — | — | 多對多中介，CASCADE DELETE |
| asset_tags | — | — | 多對多中介，CASCADE DELETE |

---

## 4. 核心功能規格

### 4.1 素材登錄

- 使用者手動新增素材，填寫：display_name、file_path（瀏覽選擇）、booth_url、相容模型、標籤
- 填入 booth_url 後，Rust 後端自動以 reqwest 抓取 OG image，存入 thumbnail_url
- name 欄位從 file_path 自動解析 filename

### 4.2 篩選邏輯

篩選條件為 **AND**：素材必須同時符合所有已選的模型與標籤條件。

```sql
-- 範例：篩選「模型 A 可用」且「標籤為飾品」的素材
SELECT DISTINCT a.*
FROM   assets a
JOIN   asset_models am ON am.asset_id = a.id
JOIN   asset_tags   at ON at.asset_id = a.id
WHERE  am.model_id = :model_a
  AND  at.tag_id   = :tag_accessory;
```

多個模型或標籤時，使用動態生成的 `IN` + `GROUP BY HAVING COUNT` 確保 AND 語意。

### 4.3 檔案路徑驗證

- 每次開啟應用或進入素材詳細頁時，Rust 後端檢查 file_path 是否存在
- 路徑失效時在素材卡片顯示警告 badge（⚠ 檔案遺失）
- 使用者可點選警告，手動重新指定正確路徑並更新 DB

### 4.4 Booth OG Image 抓取

- Rust command：`fetch_booth_thumbnail(url: String) -> Result<Option<String>>`
- 以 reqwest 抓取 HTML，解析 `<meta property="og:image">` 的 content 值
- 回傳 image URL 存入 thumbnail_url；抓取失敗則顯示 placeholder

---

## 5. UI 設計規格

### 5.1 整體佈局

雙欄式佈局：左側 Sidebar（固定 240px）+ 右側主區域（卡片 Grid）。

```
┌─────────────────────┬──────────────────────────────────────┐
│  左側 Sidebar       │  主區域                               │
│                     │                                        │
│  🔍 搜尋欄          │  [ 縮圖 ]  素材名稱   🏷飾品  🏷A模型 │
│                     │  [ 縮圖 ]  素材名稱   🏷頭髮          │
│  📦 所有素材        │  [ 縮圖 ]  ⚠ 素材名稱  🏷B模型        │
│  ─────────────────  │                                        │
│  🧍 依模型篩選      │                                        │
│    ☑ 模型 A         │                                        │
│    ☐ 模型 B         │                                        │
│  ─────────────────  │                                        │
│  🏷 依標籤篩選      │                                        │
│    ☑ 飾品           │                                        │
│    ☐ 頭髮           │                                        │
└─────────────────────┴──────────────────────────────────────┘
```

點選素材卡片 → 右側展開 Detail Panel（可編輯所有欄位）。

### 5.2 素材卡片

- Booth OG image 縮圖（或 placeholder）
- display_name（若無則顯示 name）
- Tag chips（有色標籤）
- ⚠ 警告 badge（路徑失效時顯示於卡片右上角）

### 5.3 Detail Panel

- 編輯 display_name、note
- 管理相容模型（多選）
- 管理標籤（多選）
- 開啟 Booth 頁面按鈕（外部瀏覽器）
- 開啟檔案所在資料夾按鈕

---

## 6. Tauri Commands 清單

| Command | 參數 | 回傳 | 說明 |
|---------|------|------|------|
| `get_assets` | `filters: AssetFilters` | `Vec<Asset>` | AND 篩選查詢素材 |
| `create_asset` | `input: CreateAssetInput` | `Asset` | 新增素材 |
| `update_asset` | `id: i64, input: UpdateAssetInput` | `Asset` | 更新素材資料 |
| `delete_asset` | `id: i64` | `()` | 刪除素材 |
| `get_models` | — | `Vec<Model>` | 取得所有模型 |
| `create_model` | `name: String` | `Model` | 新增模型 |
| `delete_model` | `id: i64` | `()` | 刪除模型 |
| `get_tags` | — | `Vec<Tag>` | 取得所有標籤 |
| `create_tag` | `name, color: String` | `Tag` | 新增標籤 |
| `delete_tag` | `id: i64` | `()` | 刪除標籤 |
| `fetch_booth_thumbnail` | `url: String` | `Option<String>` | 抓取 Booth OG image URL |
| `validate_file_path` | `path: String` | `bool` | 檢查路徑是否存在 |
| `open_file_location` | `path: String` | `()` | 開啟檔案所在資料夾 |

---

## 7. 開發計劃

| 階段 | 名稱 | 主要任務 |
|------|------|---------|
| P1 | 專案初始化 & DB 設置 | 初始化 Tauri + React + TypeScript、設定 tauri-plugin-sql、建立 migration、確認 DB 連線 |
| P2 | Rust Commands | assets / models / tags CRUD、AND 篩選 query、fetch_booth_thumbnail、validate_file_path |
| P3 | 前端骨架 | Sidebar、AssetGrid、AssetCard、Detail Panel、Zustand 狀態管理 |
| P4 | 功能整合 | 篩選邏輯串接、新增素材表單（含自動抓縮圖）、路徑警告 UI、開啟 Booth / 資料夾 |
| P5 | 完善與打包 | UI 細節、錯誤處理、Windows MSI 打包（tauri build）、使用者測試 |

---

## 8. 注意事項與未來擴充

### 已知限制

- 素材路徑移動後需手動更新，應用只提供警告不自動修復
- Booth OG image 抓取依賴網路，離線時顯示 placeholder
- 初版不支援批次匯入，素材需逐一手動登錄

### 未來可擴充功能

- 批次掃描資料夾自動發現素材
- 素材路徑重新對應工具（批次修復遺失路徑）
- 素材相依性標記（此素材需搭配 X shader）
- 統計面板（素材總數、各模型可用數量）
