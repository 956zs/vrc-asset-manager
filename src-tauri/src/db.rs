use rusqlite::{params, Connection};
use std::{path::PathBuf, sync::Mutex};

pub struct DbState {
    pub conn: Mutex<Connection>,
}

pub fn init(db_path: PathBuf) -> Result<DbState, Box<dyn std::error::Error>> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.execute_batch(include_str!("../migrations/001_initial.sql"))?;
    migrate_sort_order(&conn)?;
    seed_vcc_repositories(&conn)?;

    Ok(DbState {
        conn: Mutex::new(conn),
    })
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
