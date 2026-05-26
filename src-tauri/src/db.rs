use rusqlite::Connection;
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

    Ok(DbState {
        conn: Mutex::new(conn),
    })
}
