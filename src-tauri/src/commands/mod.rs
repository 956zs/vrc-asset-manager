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

pub(crate) const HTTP_USER_AGENT: &str = "VRC Asset Manager/0.1";

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

pub(crate) fn require_trimmed(value: &str, message: &str) -> CommandResult<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        Err(message.to_string())
    } else {
        Ok(trimmed.to_string())
    }
}

pub(crate) fn ensure_affected(affected: usize, message: &str) -> CommandResult<()> {
    if affected == 0 {
        Err(message.to_string())
    } else {
        Ok(())
    }
}

pub(crate) fn normalize_tag_color(color: &str) -> String {
    let color = color.trim();
    if color.is_empty() {
        "#6B7280".to_string()
    } else {
        color.to_string()
    }
}

pub(crate) fn db_error(error: impl std::fmt::Display) -> String {
    error.to_string()
}
