use crate::{
    db::DbState,
    types::{Asset, AssetFilters, CreateAssetInput, UpdateAssetInput},
};
use rusqlite::{params, params_from_iter, types::Value, Connection, Row, Transaction};
use std::{
    path::{Path, PathBuf},
    process::Command,
};
use tauri::State;

use super::{
    booth, connection, db_error, models::list_models_for_asset, normalize_optional,
    tags::list_tags_for_asset, CommandResult,
};

#[derive(Debug)]
struct AssetBase {
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

fn asset_base_from_row(row: &Row<'_>) -> rusqlite::Result<AssetBase> {
    Ok(AssetBase {
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

fn asset_name_from_path(file_path: &str) -> String {
    Path::new(file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or(file_path)
        .to_string()
}

fn hydrate_asset(conn: &Connection, base: AssetBase) -> rusqlite::Result<Asset> {
    let models = list_models_for_asset(conn, base.id)?;
    let tags = list_tags_for_asset(conn, base.id)?;
    let file_exists = Path::new(&base.file_path).exists();

    Ok(Asset {
        id: base.id,
        name: base.name,
        display_name: base.display_name,
        file_path: base.file_path,
        booth_url: base.booth_url,
        thumbnail_url: base.thumbnail_url,
        note: base.note,
        created_at: base.created_at,
        updated_at: base.updated_at,
        models,
        tags,
        file_exists,
    })
}

fn get_asset_by_id(conn: &Connection, id: i64) -> rusqlite::Result<Asset> {
    let base = conn.query_row(
        "SELECT id, name, display_name, file_path, booth_url, thumbnail_url, note, created_at, updated_at
         FROM assets
         WHERE id = ?",
        params![id],
        asset_base_from_row,
    )?;

    hydrate_asset(conn, base)
}

fn insert_asset_models(
    tx: &Transaction<'_>,
    asset_id: i64,
    model_ids: &[i64],
) -> rusqlite::Result<()> {
    let mut stmt =
        tx.prepare("INSERT OR IGNORE INTO asset_models (asset_id, model_id) VALUES (?, ?)")?;
    for model_id in model_ids {
        stmt.execute(params![asset_id, model_id])?;
    }
    Ok(())
}

fn insert_asset_tags(tx: &Transaction<'_>, asset_id: i64, tag_ids: &[i64]) -> rusqlite::Result<()> {
    let mut stmt =
        tx.prepare("INSERT OR IGNORE INTO asset_tags (asset_id, tag_id) VALUES (?, ?)")?;
    for tag_id in tag_ids {
        stmt.execute(params![asset_id, tag_id])?;
    }
    Ok(())
}

fn replace_asset_relations(
    tx: &Transaction<'_>,
    asset_id: i64,
    model_ids: &[i64],
    tag_ids: &[i64],
) -> rusqlite::Result<()> {
    tx.execute(
        "DELETE FROM asset_models WHERE asset_id = ?",
        params![asset_id],
    )?;
    tx.execute(
        "DELETE FROM asset_tags WHERE asset_id = ?",
        params![asset_id],
    )?;
    insert_asset_models(tx, asset_id, model_ids)?;
    insert_asset_tags(tx, asset_id, tag_ids)?;
    Ok(())
}

fn resolve_thumbnail(booth_url: &Option<String>, thumbnail_url: Option<String>) -> Option<String> {
    match (thumbnail_url, booth_url) {
        (Some(thumbnail), _) => Some(thumbnail),
        (None, Some(url)) => booth::fetch_thumbnail_url(url).ok().flatten(),
        (None, None) => None,
    }
}

#[tauri::command]
pub fn get_assets(filters: AssetFilters, db: State<'_, DbState>) -> CommandResult<Vec<Asset>> {
    let conn = connection(&db)?;
    let mut sql = String::from(
        "SELECT a.id, a.name, a.display_name, a.file_path, a.booth_url, a.thumbnail_url, a.note, a.created_at, a.updated_at
         FROM assets a
         WHERE 1 = 1",
    );
    let mut values: Vec<Value> = Vec::new();

    if let Some(search) = filters
        .search
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let pattern = format!("%{}%", search.to_lowercase());
        sql.push_str(
            " AND (
                LOWER(COALESCE(a.display_name, a.name)) LIKE ?
                OR LOWER(a.file_path) LIKE ?
                OR LOWER(COALESCE(a.note, '')) LIKE ?
            )",
        );
        values.push(Value::Text(pattern.clone()));
        values.push(Value::Text(pattern.clone()));
        values.push(Value::Text(pattern));
    }

    if !filters.model_ids.is_empty() {
        let placeholders = vec!["?"; filters.model_ids.len()].join(", ");
        sql.push_str(&format!(
            " AND a.id IN (
                SELECT asset_id
                FROM asset_models
                WHERE model_id IN ({})
                GROUP BY asset_id
                HAVING COUNT(DISTINCT model_id) = ?
            )",
            placeholders
        ));
        for id in &filters.model_ids {
            values.push(Value::Integer(*id));
        }
        values.push(Value::Integer(filters.model_ids.len() as i64));
    }

    if !filters.tag_ids.is_empty() {
        let placeholders = vec!["?"; filters.tag_ids.len()].join(", ");
        sql.push_str(&format!(
            " AND a.id IN (
                SELECT asset_id
                FROM asset_tags
                WHERE tag_id IN ({})
                GROUP BY asset_id
                HAVING COUNT(DISTINCT tag_id) = ?
            )",
            placeholders
        ));
        for id in &filters.tag_ids {
            values.push(Value::Integer(*id));
        }
        values.push(Value::Integer(filters.tag_ids.len() as i64));
    }

    sql.push_str(" ORDER BY a.updated_at DESC, a.id DESC");

    let bases = {
        let mut stmt = conn.prepare(&sql).map_err(db_error)?;
        let rows = stmt
            .query_map(params_from_iter(values.iter()), asset_base_from_row)
            .map_err(db_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(db_error)?
    };

    bases
        .into_iter()
        .map(|base| hydrate_asset(&conn, base))
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(db_error)
}

#[tauri::command]
pub fn create_asset(input: CreateAssetInput, db: State<'_, DbState>) -> CommandResult<Asset> {
    let file_path = input.file_path.trim().to_string();
    if file_path.is_empty() {
        return Err("File path is required".to_string());
    }

    let name = asset_name_from_path(&file_path);
    let display_name = normalize_optional(input.display_name);
    let booth_url = normalize_optional(input.booth_url);
    let thumbnail_url = resolve_thumbnail(&booth_url, normalize_optional(input.thumbnail_url));
    let note = normalize_optional(input.note);

    let mut conn = connection(&db)?;
    let tx = conn.transaction().map_err(db_error)?;
    tx.execute(
        "INSERT INTO assets (name, display_name, file_path, booth_url, thumbnail_url, note)
         VALUES (?, ?, ?, ?, ?, ?)",
        params![
            name,
            display_name,
            file_path,
            booth_url,
            thumbnail_url,
            note
        ],
    )
    .map_err(db_error)?;

    let id = tx.last_insert_rowid();
    insert_asset_models(&tx, id, &input.model_ids).map_err(db_error)?;
    insert_asset_tags(&tx, id, &input.tag_ids).map_err(db_error)?;
    tx.commit().map_err(db_error)?;

    get_asset_by_id(&conn, id).map_err(db_error)
}

#[tauri::command]
pub fn update_asset(
    id: i64,
    input: UpdateAssetInput,
    db: State<'_, DbState>,
) -> CommandResult<Asset> {
    let file_path = input.file_path.trim().to_string();
    if file_path.is_empty() {
        return Err("File path is required".to_string());
    }

    let name = asset_name_from_path(&file_path);
    let display_name = normalize_optional(input.display_name);
    let booth_url = normalize_optional(input.booth_url);
    let thumbnail_url = resolve_thumbnail(&booth_url, normalize_optional(input.thumbnail_url));
    let note = normalize_optional(input.note);

    let mut conn = connection(&db)?;
    let tx = conn.transaction().map_err(db_error)?;
    let affected = tx
        .execute(
            "UPDATE assets
             SET name = ?, display_name = ?, file_path = ?, booth_url = ?, thumbnail_url = ?, note = ?, updated_at = datetime('now')
             WHERE id = ?",
            params![name, display_name, file_path, booth_url, thumbnail_url, note, id],
        )
        .map_err(db_error)?;

    if affected == 0 {
        return Err("Asset was not found".to_string());
    }

    replace_asset_relations(&tx, id, &input.model_ids, &input.tag_ids).map_err(db_error)?;
    tx.commit().map_err(db_error)?;

    get_asset_by_id(&conn, id).map_err(db_error)
}

#[tauri::command]
pub fn delete_asset(id: i64, db: State<'_, DbState>) -> CommandResult<()> {
    let conn = connection(&db)?;
    conn.execute("DELETE FROM assets WHERE id = ?", params![id])
        .map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub fn validate_file_path(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub fn open_file_location(path: String) -> CommandResult<()> {
    let target = PathBuf::from(path);
    let open_target = if target.is_dir() {
        target
    } else if let Some(parent) = target.parent().filter(|parent| parent.exists()) {
        parent.to_path_buf()
    } else {
        return Err("The folder path does not exist".to_string());
    };

    #[cfg(target_os = "windows")]
    {
        let mut command = Command::new("explorer");
        command.arg(open_target.as_os_str());
        command.spawn().map_err(db_error)?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(open_target.as_os_str())
            .spawn()
            .map_err(db_error)?;
        return Ok(());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(open_target.as_os_str())
            .spawn()
            .map_err(db_error)?;
        return Ok(());
    }

    #[allow(unreachable_code)]
    Err("Opening folders is not supported on this platform".to_string())
}
