use rusqlite::{params, Connection};
use std::{
    env, fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

pub struct DbState {
    pub conn: Mutex<Connection>,
}

const VCC_OFFICIAL_URL: &str = "https://packages.vrchat.com/official";
const VCC_CURATED_URL: &str = "https://packages.vrchat.com/curated";
const BUILTIN_VCC_REPOSITORIES: [(&str, &str); 2] = [
    ("VRChat Official", VCC_OFFICIAL_URL),
    ("VRChat Curated", VCC_CURATED_URL),
];
const DEMO_ASSET_FOLDERS: [&str; 6] = [
    "Aurora_Layered_Coat",
    "Pulse_Expression_Pack",
    "Studio_Light_Rig",
    "Nebula_Toon_Shader",
    "Compact_Inventory_Helper",
    "Rainy_Day_Accessories",
];
const DEMO_MODELS: [(i64, &str, &str, i64); 5] = [
    (1, "nova", "Nova Demo Base", 1),
    (2, "mio", "Mio Demo Base", 2),
    (3, "luna", "Luna Demo Base", 3),
    (4, "rin", "Rin Demo Base", 4),
    (
        5,
        "layout-long-name",
        "Very Long Demo Base Name For Layout Testing",
        5,
    ),
];
const DEMO_TAGS: [(i64, &str, &str, i64); 6] = [
    (1, "Outfit", "#22C55E", 1),
    (2, "Utility", "#3B82F6", 2),
    (3, "Gesture", "#F97316", 3),
    (4, "Shader", "#A855F7", 4),
    (5, "Free", "#14B8A6", 5),
    (6, "Quest", "#F59E0B", 6),
];
const DEMO_ASSETS: [(i64, &str, &str, &str, &str, &str); 6] = [
    (
        1,
        "Aurora_Layered_Coat",
        "Aurora Layered Coat",
        "https://example.com/assets/aurora-layered-coat",
        "#22C55E",
        "Demo outfit entry with fake paths and links.",
    ),
    (
        2,
        "Pulse_Expression_Pack",
        "Pulse Expression Pack",
        "https://example.com/assets/pulse-expression-pack",
        "#F97316",
        "Demo expression pack for screenshots.",
    ),
    (
        3,
        "Studio_Light_Rig",
        "Studio Light Rig",
        "https://example.com/assets/studio-light-rig",
        "#3B82F6",
        "Demo utility tool with related links.",
    ),
    (
        4,
        "Nebula_Toon_Shader",
        "Nebula Toon Shader Preset",
        "https://example.com/assets/nebula-toon-shader",
        "#A855F7",
        "Demo shader preset.",
    ),
    (
        5,
        "Compact_Inventory_Helper",
        "Compact Inventory Helper",
        "https://example.com/assets/compact-inventory-helper",
        "#14B8A6",
        "Demo helper tool.",
    ),
    (
        6,
        "Rainy_Day_Accessories",
        "Rainy Day Accessories",
        "https://example.com/assets/rainy-day-accessories",
        "#F59E0B",
        "Demo accessory pack.",
    ),
];
const DEMO_ASSET_MODELS: [(i64, i64); 11] = [
    (1, 1),
    (1, 2),
    (2, 1),
    (2, 3),
    (3, 1),
    (3, 2),
    (3, 3),
    (4, 5),
    (5, 1),
    (6, 2),
    (6, 4),
];
const DEMO_ASSET_TAGS: [(i64, i64); 11] = [
    (1, 1),
    (1, 6),
    (2, 3),
    (2, 5),
    (3, 2),
    (3, 4),
    (4, 4),
    (5, 2),
    (5, 5),
    (6, 1),
    (6, 5),
];
const DEMO_ASSET_LINKS: [(i64, i64, &str, &str, i64); 4] = [
    (
        1,
        1,
        "Forum thread",
        "https://example.com/demo/aurora-thread",
        1,
    ),
    (
        2,
        1,
        "Setup notes",
        "https://example.com/demo/aurora-setup",
        2,
    ),
    (
        3,
        3,
        "Helper plugin",
        "https://example.com/demo/light-rig-helper",
        1,
    ),
    (
        4,
        5,
        "Documentation",
        "https://example.com/demo/inventory-docs",
        1,
    ),
];

pub fn init(db_path: PathBuf, seed_demo: bool) -> Result<DbState, Box<dyn std::error::Error>> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.execute_batch(include_str!("../migrations/001_initial.sql"))?;
    migrate_sort_order(&conn)?;
    migrate_asset_category(&conn)?;
    ensure_library_settings(&conn)?;
    ensure_vcc_repositories(&conn)?;
    if seed_demo {
        seed_demo_data(&conn)?;
    }

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}

pub(crate) fn ensure_vcc_repositories(conn: &Connection) -> rusqlite::Result<()> {
    for (name, url) in BUILTIN_VCC_REPOSITORIES {
        conn.execute(
            "INSERT OR IGNORE INTO vcc_repositories (name, url) VALUES (?, ?)",
            params![name, url],
        )?;
    }

    Ok(())
}

fn demo_thumbnail(accent: &str) -> String {
    let accent = accent.trim_start_matches('#');
    format!(
        concat!(
            "data:image/svg+xml,",
            "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E",
            "%3Crect width='512' height='512' rx='48' fill='%23070b12'/%3E",
            "%3Crect x='72' y='76' width='368' height='296' rx='36' fill='%23111827' ",
            "stroke='%23f8fafc' stroke-opacity='.12' stroke-width='6'/%3E",
            "%3Cpath d='M144 326h224' stroke='%23f8fafc' stroke-opacity='.32' ",
            "stroke-width='16' stroke-linecap='round'/%3E",
            "%3Cpath d='M174 360h164' stroke='%23f8fafc' stroke-opacity='.16' ",
            "stroke-width='12' stroke-linecap='round'/%3E",
            "%3Ccircle cx='256' cy='210' r='72' fill='%23{}' fill-opacity='.82'/%3E",
            "%3Cpath d='M256 154l28 56-28 56-28-56z' fill='%23f8fafc' ",
            "fill-opacity='.5'/%3E",
            "%3Ccircle cx='356' cy='136' r='24' fill='%23{}' fill-opacity='.34'/%3E",
            "%3C/svg%3E"
        ),
        accent, accent
    )
}

fn write_demo_file(path: PathBuf, content: &str) -> rusqlite::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| rusqlite::Error::ToSqlConversionFailure(error.into()))?;
    }
    fs::write(path, content).map_err(|error| rusqlite::Error::ToSqlConversionFailure(error.into()))
}

fn seed_demo_data(conn: &Connection) -> rusqlite::Result<()> {
    let asset_count: i64 = conn.query_row("SELECT COUNT(*) FROM assets", [], |row| row.get(0))?;
    if asset_count > 0 {
        return Ok(());
    }

    let demo_root = demo_root();
    let asset_root = demo_root.join("assets");
    seed_demo_asset_files(&asset_root)?;
    seed_demo_models(conn)?;
    seed_demo_tags(conn)?;
    seed_demo_assets(conn, &asset_root)?;
    seed_demo_asset_models(conn)?;
    seed_demo_asset_tags(conn)?;
    seed_demo_asset_links(conn)?;
    seed_demo_vcc(&demo_root, conn)?;

    Ok(())
}

fn demo_root() -> PathBuf {
    env::var_os("VRC_ASSET_MANAGER_DEMO_ROOT")
        .map(PathBuf::from)
        .or_else(|| {
            env::var_os("VRC_ASSET_MANAGER_DB_PATH")
                .map(PathBuf::from)
                .and_then(|path| path.parent().map(PathBuf::from))
        })
        .unwrap_or_else(|| env::temp_dir().join("vrc-asset-manager-demo"))
}

fn seed_demo_asset_files(asset_root: &Path) -> rusqlite::Result<()> {
    for folder in DEMO_ASSET_FOLDERS {
        write_demo_file(
            asset_root.join(folder).join("README.txt"),
            "Demo placeholder. This is not a real VRChat asset.",
        )?;
    }

    Ok(())
}

fn seed_demo_models(conn: &Connection) -> rusqlite::Result<()> {
    for (id, name, display_name, sort_order) in DEMO_MODELS {
        conn.execute(
            "INSERT OR IGNORE INTO models (id, name, display_name, sort_order)
             VALUES (?, ?, ?, ?)",
            params![id, name, display_name, sort_order],
        )?;
    }

    Ok(())
}

fn seed_demo_tags(conn: &Connection) -> rusqlite::Result<()> {
    for (id, name, color, sort_order) in DEMO_TAGS {
        conn.execute(
            "INSERT OR IGNORE INTO tags (id, name, color, sort_order)
             VALUES (?, ?, ?, ?)",
            params![id, name, color, sort_order],
        )?;
    }

    Ok(())
}

fn seed_demo_assets(conn: &Connection, asset_root: &Path) -> rusqlite::Result<()> {
    for (id, folder, display_name, booth_url, accent, note) in DEMO_ASSETS {
        let path = asset_root.join(folder).to_string_lossy().to_string();
        conn.execute(
            "INSERT OR IGNORE INTO assets
                (id, name, display_name, file_path, booth_url, thumbnail_url, note)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![
                id,
                folder,
                display_name,
                path,
                booth_url,
                demo_thumbnail(accent),
                note
            ],
        )?;
    }

    Ok(())
}

fn seed_demo_asset_models(conn: &Connection) -> rusqlite::Result<()> {
    for (asset_id, model_id) in DEMO_ASSET_MODELS {
        conn.execute(
            "INSERT OR IGNORE INTO asset_models (asset_id, model_id) VALUES (?, ?)",
            params![asset_id, model_id],
        )?;
    }

    Ok(())
}

fn seed_demo_asset_tags(conn: &Connection) -> rusqlite::Result<()> {
    for (asset_id, tag_id) in DEMO_ASSET_TAGS {
        conn.execute(
            "INSERT OR IGNORE INTO asset_tags (asset_id, tag_id) VALUES (?, ?)",
            params![asset_id, tag_id],
        )?;
    }

    Ok(())
}

fn seed_demo_asset_links(conn: &Connection) -> rusqlite::Result<()> {
    for (id, asset_id, label, url, sort_order) in DEMO_ASSET_LINKS {
        conn.execute(
            "INSERT OR IGNORE INTO asset_links (id, asset_id, label, url, sort_order)
             VALUES (?, ?, ?, ?, ?)",
            params![id, asset_id, label, url, sort_order],
        )?;
    }

    Ok(())
}

fn seed_demo_vcc(demo_root: &Path, conn: &Connection) -> rusqlite::Result<()> {
    let project_root = demo_root.join("projects").join("Aurora_Showcase_Project");
    let packages_root = project_root.join("Packages");
    seed_demo_vcc_project_files(&packages_root)?;
    seed_demo_vcc_project_row(conn, &project_root)?;
    seed_demo_vcc_repository_cache()?;

    Ok(())
}

fn seed_demo_vcc_project_files(packages_root: &Path) -> rusqlite::Result<()> {
    write_demo_file(
        packages_root.join("vpm-manifest.json"),
        r#"{
  "dependencies": {
    "com.vrchat.avatars": "3.8.2",
    "com.example.pose-helper": {
      "version": "1.2.0",
      "displayName": "Pose Helper Demo",
      "source": "VRChat Curated"
    },
    "com.example.scene-validator": {
      "version": "0.9.1",
      "displayName": "Scene Validator Demo",
      "source": "VRChat Curated"
    }
  }
}
"#,
    )?;
    write_demo_file(
        packages_root.join("manifest.json"),
        r#"{
  "dependencies": {
    "com.unity.textmeshpro": "3.0.6",
    "com.vrchat.avatars": "3.8.2"
  }
}
"#,
    )?;
    write_demo_file(
        packages_root
            .join("com.vrchat.avatars")
            .join("package.json"),
        r#"{"displayName":"VRChat SDK - Avatars","version":"3.8.2"}"#,
    )?;
    write_demo_file(
        packages_root
            .join("com.example.pose-helper")
            .join("package.json"),
        r#"{"displayName":"Pose Helper Demo","version":"1.1.0"}"#,
    )?;

    Ok(())
}

fn seed_demo_vcc_project_row(conn: &Connection, project_root: &Path) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO vcc_projects (id, name, path)
         VALUES (?, ?, ?)",
        params![
            1,
            "Aurora Showcase Project",
            project_root.to_string_lossy().to_string()
        ],
    )?;

    Ok(())
}

fn seed_demo_vcc_repository_cache() -> rusqlite::Result<()> {
    if let Some(local_app_data) = env::var_os("LOCALAPPDATA").map(PathBuf::from) {
        let repos_dir = local_app_data.join("VRChatCreatorCompanion").join("Repos");
        write_demo_official_repo_cache(&repos_dir)?;
        write_demo_curated_repo_cache(&repos_dir)?;
    }

    Ok(())
}

fn write_demo_official_repo_cache(repos_dir: &Path) -> rusqlite::Result<()> {
    write_demo_file(
        repos_dir.join("official-demo.json"),
        r#"{
  "repo": {
    "name": "VRChat Official",
    "url": "https://packages.vrchat.com/official",
    "packages": {
      "com.vrchat.avatars": {
        "versions": {
          "3.8.2": {
            "displayName": "VRChat SDK - Avatars"
          }
        }
      }
    }
  }
}
"#,
    )
}

fn write_demo_curated_repo_cache(repos_dir: &Path) -> rusqlite::Result<()> {
    write_demo_file(
        repos_dir.join("curated-demo.json"),
        r#"{
  "repo": {
    "name": "VRChat Curated",
    "url": "https://packages.vrchat.com/curated",
    "packages": {
      "com.example.pose-helper": {
        "versions": {
          "1.2.0": {
            "displayName": "Pose Helper Demo"
          }
        }
      },
      "com.example.scene-validator": {
        "versions": {
          "0.9.1": {
            "displayName": "Scene Validator Demo"
          }
        }
      }
    }
  }
}
"#,
    )
}

fn has_column(conn: &Connection, table: &str, column: &str) -> rusqlite::Result<bool> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table))?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(1))?;

    for row in rows {
        if row? == column {
            return Ok(true);
        }
    }

    Ok(false)
}

fn migrate_sort_order(conn: &Connection) -> rusqlite::Result<()> {
    if !has_column(conn, "models", "sort_order")? {
        conn.execute(
            "ALTER TABLE models ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    if !has_column(conn, "tags", "sort_order")? {
        conn.execute(
            "ALTER TABLE tags ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    conn.execute("UPDATE models SET sort_order = id WHERE sort_order = 0", [])?;
    conn.execute("UPDATE tags SET sort_order = id WHERE sort_order = 0", [])?;

    Ok(())
}

fn migrate_asset_category(conn: &Connection) -> rusqlite::Result<()> {
    if !has_column(conn, "assets", "category")? {
        conn.execute(
            "ALTER TABLE assets ADD COLUMN category TEXT NOT NULL DEFAULT 'accessory'",
            [],
        )?;
    }

    conn.execute(
        "UPDATE assets
         SET category = 'accessory'
         WHERE category NOT IN ('avatar', 'accessory', 'world')
            OR category IS NULL
            OR TRIM(category) = ''",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category)",
        [],
    )?;

    Ok(())
}

fn ensure_library_settings(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS library_settings (
            id               INTEGER PRIMARY KEY CHECK (id = 1),
            root_path        TEXT,
            avatar_folder    TEXT NOT NULL DEFAULT '素體',
            accessory_folder TEXT NOT NULL DEFAULT '素體配件',
            world_folder     TEXT NOT NULL DEFAULT '世界',
            updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        [],
    )?;
    conn.execute(
        "INSERT OR IGNORE INTO library_settings
            (id, root_path, avatar_folder, accessory_folder, world_folder)
         VALUES
            (1, NULL, '素體', '素體配件', '世界')",
        [],
    )?;

    Ok(())
}
