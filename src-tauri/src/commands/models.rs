use crate::{
    db::DbState,
    types::{CreateModelInput, Model, ReorderModelsInput, UpdateModelInput},
};
use rusqlite::{params, Connection, Row};
use tauri::State;

use super::{connection, db_error, normalize_optional, CommandResult};

fn model_from_row(row: &Row<'_>) -> rusqlite::Result<Model> {
    Ok(Model {
        id: row.get(0)?,
        name: row.get(1)?,
        display_name: row.get(2)?,
        sort_order: row.get(3)?,
        created_at: row.get(4)?,
    })
}

fn next_sort_order(conn: &Connection) -> rusqlite::Result<i64> {
    conn.query_row(
        "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM models",
        [],
        |row| row.get(0),
    )
}

pub(crate) fn list_models_for_asset(
    conn: &Connection,
    asset_id: i64,
) -> rusqlite::Result<Vec<Model>> {
    let mut stmt = conn.prepare(
        "SELECT m.id, m.name, m.display_name, m.sort_order, m.created_at
         FROM models m
         INNER JOIN asset_models am ON am.model_id = m.id
         WHERE am.asset_id = ?
         ORDER BY m.sort_order ASC, COALESCE(m.display_name, m.name) COLLATE NOCASE",
    )?;

    let rows = stmt.query_map(params![asset_id], model_from_row)?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
}

#[tauri::command]
pub fn get_models(db: State<'_, DbState>) -> CommandResult<Vec<Model>> {
    let conn = connection(&db)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, display_name, sort_order, created_at
             FROM models
             ORDER BY sort_order ASC, COALESCE(display_name, name) COLLATE NOCASE",
        )
        .map_err(db_error)?;

    let rows = stmt.query_map([], model_from_row).map_err(db_error)?;
    let models = rows
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(db_error)?;
    Ok(models)
}

#[tauri::command]
pub fn create_model(input: CreateModelInput, db: State<'_, DbState>) -> CommandResult<Model> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err("Model name is required".to_string());
    }

    let display_name = normalize_optional(input.display_name);
    let conn = connection(&db)?;
    let sort_order = next_sort_order(&conn).map_err(db_error)?;
    conn.execute(
        "INSERT INTO models (name, display_name, sort_order) VALUES (?, ?, ?)",
        params![name, display_name, sort_order],
    )
    .map_err(db_error)?;

    let id = conn.last_insert_rowid();
    let mut stmt = conn
        .prepare("SELECT id, name, display_name, sort_order, created_at FROM models WHERE id = ?")
        .map_err(db_error)?;

    stmt.query_row(params![id], model_from_row)
        .map_err(db_error)
}

#[tauri::command]
pub fn update_model(
    id: i64,
    input: UpdateModelInput,
    db: State<'_, DbState>,
) -> CommandResult<Model> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err("Model name is required".to_string());
    }

    let display_name = normalize_optional(input.display_name);
    let conn = connection(&db)?;
    let affected = conn
        .execute(
            "UPDATE models SET name = ?, display_name = ? WHERE id = ?",
            params![name, display_name, id],
        )
        .map_err(db_error)?;

    if affected == 0 {
        return Err("Model was not found".to_string());
    }

    let mut stmt = conn
        .prepare("SELECT id, name, display_name, sort_order, created_at FROM models WHERE id = ?")
        .map_err(db_error)?;

    stmt.query_row(params![id], model_from_row)
        .map_err(db_error)
}

#[tauri::command]
pub fn delete_model(id: i64, db: State<'_, DbState>) -> CommandResult<()> {
    let conn = connection(&db)?;
    conn.execute("DELETE FROM models WHERE id = ?", params![id])
        .map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub fn reorder_models(input: ReorderModelsInput, db: State<'_, DbState>) -> CommandResult<()> {
    let mut conn = connection(&db)?;
    let tx = conn.transaction().map_err(db_error)?;

    {
        let mut stmt = tx
            .prepare("UPDATE models SET sort_order = ? WHERE id = ?")
            .map_err(db_error)?;

        for (index, model_id) in input.model_ids.iter().enumerate() {
            let affected = stmt
                .execute(params![index as i64 + 1, model_id])
                .map_err(db_error)?;
            if affected == 0 {
                return Err("Model was not found".to_string());
            }
        }
    }

    tx.commit().map_err(db_error)?;
    Ok(())
}
