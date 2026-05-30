pub mod assets;
pub mod booth;
pub mod models;
pub mod saves;
pub mod tags;
pub mod vcc;

use crate::db::DbState;
use rusqlite::Connection;
use std::sync::MutexGuard;
use tauri::State;

pub type CommandResult<T> = Result<T, String>;

pub(crate) fn connection<'a>(
    db: &'a State<'_, DbState>,
) -> CommandResult<MutexGuard<'a, Connection>> {
    db.conn
        .lock()
        .map_err(|_| "Database connection is unavailable".to_string())
}

pub(crate) fn normalize_optional(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

pub(crate) fn db_error(error: impl std::fmt::Display) -> String {
    error.to_string()
}
