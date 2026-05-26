use crate::db::DbState;
use rusqlite::{params, Connection, Row, Transaction};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
use tauri::State;

use super::{connection, db_error, CommandResult};

const SAVE_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveModel {
    id: i64,
    name: String,
    display_name: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveTag {
    id: i64,
    name: String,
    color: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveAsset {
    id: i64,
    name: String,
    display_name: Option<String>,
    file_path: String,
    booth_url: Option<String>,
    thumbnail_url: Option<String>,
    note: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveAssetModel {
    asset_id: i64,
    model_id: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveAssetTag {
    asset_id: i64,
    tag_id: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveArchive {
    schema_version: u32,
    app: String,
    exported_at: String,
    models: Vec<SaveModel>,
    tags: Vec<SaveTag>,
    assets: Vec<SaveAsset>,
    asset_models: Vec<SaveAssetModel>,
    asset_tags: Vec<SaveAssetTag>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSummary {
    pub path: String,
    pub models: usize,
    pub tags: usize,
    pub assets: usize,
    pub asset_models: usize,
    pub asset_tags: usize,
}

fn model_from_row(row: &Row<'_>) -> rusqlite::Result<SaveModel> {
    Ok(SaveModel {
        id: row.get(0)?,
        name: row.get(1)?,
        display_name: row.get(2)?,
        created_at: row.get(3)?,
    })
}

fn tag_from_row(row: &Row<'_>) -> rusqlite::Result<SaveTag> {
    Ok(SaveTag {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
    })
}

fn asset_from_row(row: &Row<'_>) -> rusqlite::Result<SaveAsset> {
    Ok(SaveAsset {
        id: row.get(0)?,
        name: row.get(1)?,
        display_name: row.get(2)?,
        file_path: row.get(3)?,
        booth_url: row.get(4)?,
        thumbnail_url: row.get(5)?,
        note: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn asset_model_from_row(row: &Row<'_>) -> rusqlite::Result<SaveAssetModel> {
    Ok(SaveAssetModel {
        asset_id: row.get(0)?,
        model_id: row.get(1)?,
    })
}

fn asset_tag_from_row(row: &Row<'_>) -> rusqlite::Result<SaveAssetTag> {
    Ok(SaveAssetTag {
        asset_id: row.get(0)?,
        tag_id: row.get(1)?,
    })
}

fn query_all<T>(
    conn: &Connection,
    sql: &str,
    mapper: fn(&Row<'_>) -> rusqlite::Result<T>,
) -> rusqlite::Result<Vec<T>> {
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([], mapper)?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
}

fn summary(path: String, archive: &SaveArchive) -> SaveSummary {
    SaveSummary {
        path,
        models: archive.models.len(),
        tags: archive.tags.len(),
        assets: archive.assets.len(),
        asset_models: archive.asset_models.len(),
        asset_tags: archive.asset_tags.len(),
    }
}

fn require_path(path: &str) -> CommandResult<&Path> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Save file path is required".to_string());
    }

    Ok(Path::new(trimmed))
}

fn build_archive(conn: &Connection) -> CommandResult<SaveArchive> {
    let exported_at = conn
        .query_row("SELECT datetime('now')", [], |row| row.get::<_, String>(0))
        .map_err(db_error)?;

    Ok(SaveArchive {
        schema_version: SAVE_SCHEMA_VERSION,
        app: "vrc-asset-manager".to_string(),
        exported_at,
        models: query_all(
            conn,
            "SELECT id, name, display_name, created_at FROM models ORDER BY id",
            model_from_row,
        )
        .map_err(db_error)?,
        tags: query_all(conn, "SELECT id, name, color FROM tags ORDER BY id", tag_from_row)
            .map_err(db_error)?,
        assets: query_all(
            conn,
            "SELECT id, name, display_name, file_path, booth_url, thumbnail_url, note, created_at, updated_at
             FROM assets
             ORDER BY id",
            asset_from_row,
        )
        .map_err(db_error)?,
        asset_models: query_all(
            conn,
            "SELECT asset_id, model_id FROM asset_models ORDER BY asset_id, model_id",
            asset_model_from_row,
        )
        .map_err(db_error)?,
        asset_tags: query_all(
            conn,
            "SELECT asset_id, tag_id FROM asset_tags ORDER BY asset_id, tag_id",
            asset_tag_from_row,
        )
        .map_err(db_error)?,
    })
}

fn replace_database(tx: &Transaction<'_>, archive: &SaveArchive) -> CommandResult<()> {
    tx.execute("DELETE FROM asset_models", [])
        .map_err(db_error)?;
    tx.execute("DELETE FROM asset_tags", []).map_err(db_error)?;
    tx.execute("DELETE FROM assets", []).map_err(db_error)?;
    tx.execute("DELETE FROM models", []).map_err(db_error)?;
    tx.execute("DELETE FROM tags", []).map_err(db_error)?;
    tx.execute(
        "DELETE FROM sqlite_sequence WHERE name IN ('assets', 'models', 'tags')",
        [],
    )
    .map_err(db_error)?;

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO models (id, name, display_name, created_at)
                 VALUES (?, ?, ?, ?)",
            )
            .map_err(db_error)?;
        for model in &archive.models {
            stmt.execute(params![
                model.id,
                &model.name,
                model.display_name.as_deref(),
                &model.created_at
            ])
            .map_err(db_error)?;
        }
    }

    {
        let mut stmt = tx
            .prepare("INSERT INTO tags (id, name, color) VALUES (?, ?, ?)")
            .map_err(db_error)?;
        for tag in &archive.tags {
            stmt.execute(params![tag.id, &tag.name, &tag.color])
                .map_err(db_error)?;
        }
    }

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO assets
                    (id, name, display_name, file_path, booth_url, thumbnail_url, note, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .map_err(db_error)?;
        for asset in &archive.assets {
            stmt.execute(params![
                asset.id,
                &asset.name,
                asset.display_name.as_deref(),
                &asset.file_path,
                asset.booth_url.as_deref(),
                asset.thumbnail_url.as_deref(),
                asset.note.as_deref(),
                &asset.created_at,
                &asset.updated_at
            ])
            .map_err(db_error)?;
        }
    }

    {
        let mut stmt = tx
            .prepare("INSERT INTO asset_models (asset_id, model_id) VALUES (?, ?)")
            .map_err(db_error)?;
        for relation in &archive.asset_models {
            stmt.execute(params![relation.asset_id, relation.model_id])
                .map_err(db_error)?;
        }
    }

    {
        let mut stmt = tx
            .prepare("INSERT INTO asset_tags (asset_id, tag_id) VALUES (?, ?)")
            .map_err(db_error)?;
        for relation in &archive.asset_tags {
            stmt.execute(params![relation.asset_id, relation.tag_id])
                .map_err(db_error)?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn export_save(path: String, db: State<'_, DbState>) -> CommandResult<SaveSummary> {
    let save_path = require_path(&path)?;
    if let Some(parent) = save_path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        fs::create_dir_all(parent).map_err(db_error)?;
    }

    let conn = connection(&db)?;
    let archive = build_archive(&conn)?;
    let json = serde_json::to_string_pretty(&archive).map_err(db_error)?;
    fs::write(save_path, json).map_err(db_error)?;

    Ok(summary(save_path.to_string_lossy().to_string(), &archive))
}

#[tauri::command]
pub fn import_save(path: String, db: State<'_, DbState>) -> CommandResult<SaveSummary> {
    let save_path = require_path(&path)?;
    let json = fs::read_to_string(save_path).map_err(db_error)?;
    let archive: SaveArchive = serde_json::from_str(&json).map_err(db_error)?;

    if archive.schema_version != SAVE_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported save schema version: {}",
            archive.schema_version
        ));
    }

    let mut conn = connection(&db)?;
    let tx = conn.transaction().map_err(db_error)?;
    replace_database(&tx, &archive)?;
    tx.commit().map_err(db_error)?;

    Ok(summary(save_path.to_string_lossy().to_string(), &archive))
}
