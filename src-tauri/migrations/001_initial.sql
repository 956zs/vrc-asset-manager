CREATE TABLE IF NOT EXISTS models (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    display_name TEXT,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    color      TEXT    NOT NULL DEFAULT '#6B7280',
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    display_name  TEXT,
    category      TEXT    NOT NULL DEFAULT 'accessory',
    file_path     TEXT    NOT NULL,
    booth_url     TEXT,
    booth_shop_name TEXT,
    booth_shop_url  TEXT,
    thumbnail_url TEXT,
    note          TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS library_settings (
    id               INTEGER PRIMARY KEY CHECK (id = 1),
    root_path        TEXT,
    avatar_folder    TEXT NOT NULL DEFAULT '素體',
    accessory_folder TEXT NOT NULL DEFAULT '素體配件',
    world_folder     TEXT NOT NULL DEFAULT '世界',
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO library_settings
    (id, root_path, avatar_folder, accessory_folder, world_folder)
VALUES
    (1, NULL, '素體', '素體配件', '世界');

CREATE TABLE IF NOT EXISTS asset_models (
    asset_id INTEGER NOT NULL REFERENCES assets(id)  ON DELETE CASCADE,
    model_id INTEGER NOT NULL REFERENCES models(id)  ON DELETE CASCADE,
    PRIMARY KEY (asset_id, model_id)
);

CREATE TABLE IF NOT EXISTS asset_tags (
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
    PRIMARY KEY (asset_id, tag_id)
);

CREATE TABLE IF NOT EXISTS asset_links (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id   INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    label      TEXT    NOT NULL,
    url        TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vcc_projects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    path       TEXT    NOT NULL UNIQUE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vcc_repositories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    url        TEXT    NOT NULL UNIQUE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_asset_models_model ON asset_models(model_id);
CREATE INDEX IF NOT EXISTS idx_asset_models_asset ON asset_models(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag     ON asset_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_asset   ON asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_links_asset  ON asset_links(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_file_path   ON assets(file_path);
