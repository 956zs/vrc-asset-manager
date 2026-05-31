use crate::{
    db::DbState,
    types::{CreateTagInput, ReorderTagsInput, Tag, UpdateTagInput},
};
use rusqlite::{params, Connection, Row};
use tauri::State;

use super::{
    connection, db_error, ensure_affected, normalize_tag_color, require_trimmed, CommandResult,
};

fn tag_from_row(row: &Row<'_>) -> rusqlite::Result<Tag> {
    Ok(Tag {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
        sort_order: row.get(3)?,
    })
}

fn next_sort_order(conn: &Connection) -> rusqlite::Result<i64> {
    conn.query_row(
        "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM tags",
        [],
        |row| row.get(0),
    )
}

fn get_tag_by_id(conn: &Connection, id: i64) -> rusqlite::Result<Tag> {
    conn.query_row(
        "SELECT id, name, color, sort_order FROM tags WHERE id = ?",
        params![id],
        tag_from_row,
    )
}

pub(crate) fn list_tags_for_asset(conn: &Connection, asset_id: i64) -> rusqlite::Result<Vec<Tag>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.color, t.sort_order
         FROM tags t
         INNER JOIN asset_tags at ON at.tag_id = t.id
         WHERE at.asset_id = ?
         ORDER BY t.sort_order ASC, t.name COLLATE NOCASE",
    )?;

    let rows = stmt.query_map(params![asset_id], tag_from_row)?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
}

#[tauri::command]
pub fn get_tags(db: State<'_, DbState>) -> CommandResult<Vec<Tag>> {
    let conn = connection(&db)?;
    let mut stmt = conn
        .prepare("SELECT id, name, color, sort_order FROM tags ORDER BY sort_order ASC, name COLLATE NOCASE")
        .map_err(db_error)?;

    let rows = stmt.query_map([], tag_from_row).map_err(db_error)?;
    let tags = rows
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(db_error)?;
    Ok(tags)
}

#[tauri::command]
pub fn create_tag(input: CreateTagInput, db: State<'_, DbState>) -> CommandResult<Tag> {
    let name = require_trimmed(&input.name, "Tag name is required")?;
    let color = normalize_tag_color(&input.color);
    let conn = connection(&db)?;
    let sort_order = next_sort_order(&conn).map_err(db_error)?;
    conn.execute(
        "INSERT INTO tags (name, color, sort_order) VALUES (?, ?, ?)",
        params![name, color, sort_order],
    )
    .map_err(db_error)?;

    let id = conn.last_insert_rowid();
    get_tag_by_id(&conn, id).map_err(db_error)
}

#[tauri::command]
pub fn update_tag(id: i64, input: UpdateTagInput, db: State<'_, DbState>) -> CommandResult<Tag> {
    let name = require_trimmed(&input.name, "Tag name is required")?;
    let color = normalize_tag_color(&input.color);
    let conn = connection(&db)?;
    let affected = conn
        .execute(
            "UPDATE tags SET name = ?, color = ? WHERE id = ?",
            params![name, color, id],
        )
        .map_err(db_error)?;

    ensure_affected(affected, "Tag was not found")?;
    get_tag_by_id(&conn, id).map_err(db_error)
}

#[tauri::command]
pub fn delete_tag(id: i64, db: State<'_, DbState>) -> CommandResult<()> {
    let conn = connection(&db)?;
    conn.execute("DELETE FROM tags WHERE id = ?", params![id])
        .map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub fn reorder_tags(input: ReorderTagsInput, db: State<'_, DbState>) -> CommandResult<()> {
    let mut conn = connection(&db)?;
    let tx = conn.transaction().map_err(db_error)?;

    {
        let mut stmt = tx
            .prepare("UPDATE tags SET sort_order = ? WHERE id = ?")
            .map_err(db_error)?;

        for (index, tag_id) in input.tag_ids.iter().enumerate() {
            let affected = stmt
                .execute(params![index as i64 + 1, tag_id])
                .map_err(db_error)?;
            ensure_affected(affected, "Tag was not found")?;
        }
    }

    tx.commit().map_err(db_error)?;
    Ok(())
}
