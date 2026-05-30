use rusqlite::{params, Connection};
use std::{env, fs, path::PathBuf, sync::Mutex};

pub struct DbState {
    pub conn: Mutex<Connection>,
}

pub fn init(db_path: PathBuf, seed_demo: bool) -> Result<DbState, Box<dyn std::error::Error>> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.execute_batch(include_str!("../migrations/001_initial.sql"))?;
    migrate_sort_order(&conn)?;
    seed_vcc_repositories(&conn)?;
    if seed_demo {
        seed_demo_data(&conn)?;
    }

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}

fn demo_thumbnail(accent: &str) -> String {
    let accent = accent.trim_start_matches('#');
    format!(
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='56' fill='%23070b12'/%3E%3Ccircle cx='150' cy='170' r='92' fill='%23{}' fill-opacity='.72'/%3E%3Ccircle cx='338' cy='302' r='130' fill='%23{}' fill-opacity='.38'/%3E%3Cpath d='M108 370h296' stroke='%23f8fafc' stroke-opacity='.35' stroke-width='18' stroke-linecap='round'/%3E%3Cpath d='M142 404h228' stroke='%23f8fafc' stroke-opacity='.18' stroke-width='14' stroke-linecap='round'/%3E%3C/svg%3E",
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

    let demo_root = env::var_os("VRC_ASSET_MANAGER_DEMO_ROOT")
        .map(PathBuf::from)
        .or_else(|| {
            env::var_os("VRC_ASSET_MANAGER_DB_PATH")
                .map(PathBuf::from)
                .and_then(|path| path.parent().map(PathBuf::from))
        })
        .unwrap_or_else(|| env::temp_dir().join("vrc-asset-manager-demo"));
    let asset_root = demo_root.join("assets");

    for folder in [
        "Aurora_Layered_Coat",
        "Pulse_Expression_Pack",
        "Studio_Light_Rig",
        "Nebula_Toon_Shader",
        "Compact_Inventory_Helper",
        "Rainy_Day_Accessories",
    ] {
        write_demo_file(
            asset_root.join(folder).join("README.txt"),
            "Demo placeholder. This is not a real VRChat asset.",
        )?;
    }

    for (id, name, display_name, sort_order) in [
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
    ] {
        conn.execute(
            "INSERT OR IGNORE INTO models (id, name, display_name, sort_order)
             VALUES (?, ?, ?, ?)",
            params![id, name, display_name, sort_order],
        )?;
    }

    for (id, name, color, sort_order) in [
        (1, "Outfit", "#22C55E", 1),
        (2, "Utility", "#3B82F6", 2),
        (3, "Gesture", "#F97316", 3),
        (4, "Shader", "#A855F7", 4),
        (5, "Free", "#14B8A6", 5),
        (6, "Quest", "#F59E0B", 6),
    ] {
        conn.execute(
            "INSERT OR IGNORE INTO tags (id, name, color, sort_order)
             VALUES (?, ?, ?, ?)",
            params![id, name, color, sort_order],
        )?;
    }

    for (id, folder, display_name, booth_url, thumbnail, note) in [
        (
            1,
            "Aurora_Layered_Coat",
            "Aurora Layered Coat",
            "https://example.com/assets/aurora-layered-coat",
            demo_thumbnail("#22C55E"),
            "Demo outfit entry with fake paths and links.",
        ),
        (
            2,
            "Pulse_Expression_Pack",
            "Pulse Expression Pack",
            "https://example.com/assets/pulse-expression-pack",
            demo_thumbnail("#F97316"),
            "Demo expression pack for screenshots.",
        ),
        (
            3,
            "Studio_Light_Rig",
            "Studio Light Rig",
            "https://example.com/assets/studio-light-rig",
            demo_thumbnail("#3B82F6"),
            "Demo utility tool with related links.",
        ),
        (
            4,
            "Nebula_Toon_Shader",
            "Nebula Toon Shader Preset",
            "https://example.com/assets/nebula-toon-shader",
            demo_thumbnail("#A855F7"),
            "Demo shader preset.",
        ),
        (
            5,
            "Compact_Inventory_Helper",
            "Compact Inventory Helper",
            "https://example.com/assets/compact-inventory-helper",
            demo_thumbnail("#14B8A6"),
            "Demo helper tool.",
        ),
        (
            6,
            "Rainy_Day_Accessories",
            "Rainy Day Accessories",
            "https://example.com/assets/rainy-day-accessories",
            demo_thumbnail("#F59E0B"),
            "Demo accessory pack.",
        ),
    ] {
        let path = asset_root.join(folder).to_string_lossy().to_string();
        conn.execute(
            "INSERT OR IGNORE INTO assets
                (id, name, display_name, file_path, booth_url, thumbnail_url, note)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![id, folder, display_name, path, booth_url, thumbnail, note],
        )?;
    }

    for (asset_id, model_id) in [
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
    ] {
        conn.execute(
            "INSERT OR IGNORE INTO asset_models (asset_id, model_id) VALUES (?, ?)",
            params![asset_id, model_id],
        )?;
    }

    for (asset_id, tag_id) in [
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
    ] {
        conn.execute(
            "INSERT OR IGNORE INTO asset_tags (asset_id, tag_id) VALUES (?, ?)",
            params![asset_id, tag_id],
        )?;
    }

    for (id, asset_id, label, url, sort_order) in [
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
    ] {
        conn.execute(
            "INSERT OR IGNORE INTO asset_links (id, asset_id, label, url, sort_order)
             VALUES (?, ?, ?, ?, ?)",
            params![id, asset_id, label, url, sort_order],
        )?;
    }

    seed_demo_vcc(&demo_root, conn)?;

    Ok(())
}

fn seed_demo_vcc(demo_root: &std::path::Path, conn: &Connection) -> rusqlite::Result<()> {
    let project_root = demo_root.join("projects").join("Aurora_Showcase_Project");
    let packages_root = project_root.join("Packages");
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

    conn.execute(
        "INSERT OR IGNORE INTO vcc_projects (id, name, path)
         VALUES (?, ?, ?)",
        params![
            1,
            "Aurora Showcase Project",
            project_root.to_string_lossy().to_string()
        ],
    )?;

    if let Some(local_app_data) = env::var_os("LOCALAPPDATA").map(PathBuf::from) {
        let repos_dir = local_app_data.join("VRChatCreatorCompanion").join("Repos");
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
        )?;
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
        )?;
    }

    Ok(())
}

fn seed_vcc_repositories(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE vcc_repositories
         SET name = 'VRChat Official',
             url = 'https://packages.vrchat.com/official',
             updated_at = datetime('now')
         WHERE url = 'https://vrchat.github.io/packages/index.json'
           AND NOT EXISTS (
               SELECT 1 FROM vcc_repositories
               WHERE url = 'https://packages.vrchat.com/official'
           )",
        [],
    )?;
    for (name, url) in [
        ("VRChat Official", "https://packages.vrchat.com/official"),
        ("VRChat Curated", "https://packages.vrchat.com/curated"),
    ] {
        conn.execute(
            "INSERT OR IGNORE INTO vcc_repositories (name, url) VALUES (?, ?)",
            params![name, url],
        )?;
    }

    Ok(())
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
