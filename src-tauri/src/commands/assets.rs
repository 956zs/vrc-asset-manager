use crate::{
    db::DbState,
    types::{
        Asset, AssetFilters, AssetLink, AssetLinkInput, CreateAssetInput, Model, Tag,
        UpdateAssetInput,
    },
};
use rusqlite::{params, params_from_iter, types::Value, Connection, Row, Transaction};
use serde::Serialize;
#[cfg(any(target_os = "windows", unix))]
use std::process::Command;
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};
use tauri::State;

use super::{
    booth, connection, db_error, ensure_affected, models::list_models_for_asset,
    normalize_optional, require_trimmed, tags::list_tags_for_asset, CommandResult,
};

const SQL_PARAM_BATCH_SIZE: usize = 900;
const ASSET_SEARCH_PARAM_COUNT: usize = 5;
type AssetGroups<T> = BTreeMap<i64, Vec<T>>;

const ASSET_LIST_BASE_SQL: &str = "SELECT a.id, a.name, a.display_name, a.file_path, a.booth_url, a.thumbnail_url, a.note, a.created_at, a.updated_at
         FROM assets a
         WHERE 1 = 1";

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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetHealthIssue {
    pub asset_id: i64,
    pub name: String,
    pub display_name: Option<String>,
    pub file_path: String,
    pub status: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetHealthSummary {
    pub total: usize,
    pub ok: usize,
    pub missing: usize,
    pub unreadable: usize,
    pub empty_files: usize,
    pub empty_directories: usize,
    pub unsupported: usize,
    pub issues: Vec<AssetHealthIssue>,
}

struct AssetRelationFilter<'a> {
    table: &'static str,
    column: &'static str,
    ids: &'a [i64],
}

struct AssetListQuery {
    sql: String,
    values: Vec<Value>,
}

enum HealthStatus {
    Missing,
    Unreadable,
    EmptyFile,
    EmptyDirectory,
    Unsupported,
}

impl HealthStatus {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Missing => "missing",
            Self::Unreadable => "unreadable",
            Self::EmptyFile => "emptyFile",
            Self::EmptyDirectory => "emptyDirectory",
            Self::Unsupported => "unsupported",
        }
    }
}

impl AssetListQuery {
    fn new(filters: &AssetFilters) -> Self {
        let mut query = Self {
            sql: String::from(ASSET_LIST_BASE_SQL),
            values: Vec::new(),
        };

        query.push_search(filters.search.as_deref());
        query.push_relation_filter(AssetRelationFilter {
            table: "asset_models",
            column: "model_id",
            ids: &filters.model_ids,
        });
        query.push_relation_filter(AssetRelationFilter {
            table: "asset_tags",
            column: "tag_id",
            ids: &filters.tag_ids,
        });
        query.sql.push_str(" ORDER BY a.updated_at DESC, a.id DESC");
        query
    }

    fn into_parts(self) -> (String, Vec<Value>) {
        (self.sql, self.values)
    }

    fn push_search(&mut self, search: Option<&str>) {
        let Some(search) = search.map(str::trim).filter(|value| !value.is_empty()) else {
            return;
        };

        let pattern = format!("%{}%", search.to_lowercase());
        self.sql.push_str(
            " AND (
                LOWER(COALESCE(a.display_name, a.name)) LIKE ?
                OR LOWER(a.file_path) LIKE ?
                OR LOWER(COALESCE(a.note, '')) LIKE ?
                OR a.id IN (
                    SELECT asset_id
                    FROM asset_links
                    WHERE LOWER(label) LIKE ? OR LOWER(url) LIKE ?
                )
            )",
        );

        for _ in 0..ASSET_SEARCH_PARAM_COUNT {
            self.values.push(Value::Text(pattern.clone()));
        }
    }

    fn push_relation_filter(&mut self, filter: AssetRelationFilter<'_>) {
        if filter.ids.is_empty() {
            return;
        }

        let placeholders = asset_id_placeholders(filter.ids);
        let table = filter.table;
        let column = filter.column;
        self.sql.push_str(&format!(
            " AND a.id IN (
                SELECT asset_id
                FROM {table}
                WHERE {column} IN ({placeholders})
                GROUP BY asset_id
                HAVING COUNT(DISTINCT {column}) = ?
            )"
        ));
        self.values
            .extend(filter.ids.iter().map(|id| Value::Integer(*id)));
        self.values.push(Value::Integer(filter.ids.len() as i64));
    }
}

fn asset_link_from_row(row: &Row<'_>) -> rusqlite::Result<AssetLink> {
    Ok(AssetLink {
        id: row.get(0)?,
        label: row.get(1)?,
        url: row.get(2)?,
        sort_order: row.get(3)?,
    })
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

fn normalize_asset_links(links: &[AssetLinkInput]) -> Vec<AssetLinkInput> {
    links
        .iter()
        .filter_map(|link| {
            let url = link.url.trim().to_string();
            if url.is_empty() {
                return None;
            }

            let label = link.label.trim();
            Some(AssetLinkInput {
                label: if label.is_empty() {
                    url.clone()
                } else {
                    label.to_string()
                },
                url,
            })
        })
        .collect()
}

fn asset_name_from_path(file_path: &str) -> String {
    Path::new(file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or(file_path)
        .to_string()
}

fn list_links_for_asset(conn: &Connection, asset_id: i64) -> rusqlite::Result<Vec<AssetLink>> {
    let mut stmt = conn.prepare(
        "SELECT id, label, url, sort_order
         FROM asset_links
         WHERE asset_id = ?
         ORDER BY sort_order ASC, id ASC",
    )?;

    let rows = stmt.query_map(params![asset_id], asset_link_from_row)?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
}

fn asset_id_placeholders(asset_ids: &[i64]) -> String {
    vec!["?"; asset_ids.len()].join(", ")
}

fn collect_asset_rows<T>(
    conn: &Connection,
    asset_ids: &[i64],
    sql_for_ids: impl Fn(&str) -> String,
    mut row_mapper: impl FnMut(&Row<'_>) -> rusqlite::Result<(i64, T)>,
) -> rusqlite::Result<AssetGroups<T>> {
    let mut groups: AssetGroups<T> = BTreeMap::new();

    for asset_ids in asset_ids.chunks(SQL_PARAM_BATCH_SIZE) {
        let placeholders = asset_id_placeholders(asset_ids);
        let sql = sql_for_ids(&placeholders);
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params_from_iter(asset_ids.iter()), |row| row_mapper(row))?;

        for row in rows {
            let (asset_id, value) = row?;
            groups.entry(asset_id).or_default().push(value);
        }
    }

    Ok(groups)
}

fn model_for_asset_from_row(row: &Row<'_>) -> rusqlite::Result<(i64, Model)> {
    Ok((
        row.get(0)?,
        Model {
            id: row.get(1)?,
            name: row.get(2)?,
            display_name: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
        },
    ))
}

fn tag_for_asset_from_row(row: &Row<'_>) -> rusqlite::Result<(i64, Tag)> {
    Ok((
        row.get(0)?,
        Tag {
            id: row.get(1)?,
            name: row.get(2)?,
            color: row.get(3)?,
            sort_order: row.get(4)?,
        },
    ))
}

fn link_for_asset_from_row(row: &Row<'_>) -> rusqlite::Result<(i64, AssetLink)> {
    Ok((
        row.get(0)?,
        AssetLink {
            id: row.get(1)?,
            label: row.get(2)?,
            url: row.get(3)?,
            sort_order: row.get(4)?,
        },
    ))
}

fn list_models_for_assets(
    conn: &Connection,
    asset_ids: &[i64],
) -> rusqlite::Result<AssetGroups<Model>> {
    collect_asset_rows(
        conn,
        asset_ids,
        |placeholders| {
            format!(
                "SELECT am.asset_id, m.id, m.name, m.display_name, m.sort_order, m.created_at
             FROM asset_models am
             INNER JOIN models m ON m.id = am.model_id
             WHERE am.asset_id IN ({placeholders})
             ORDER BY am.asset_id, m.sort_order ASC, COALESCE(m.display_name, m.name) COLLATE NOCASE"
            )
        },
        model_for_asset_from_row,
    )
}

fn list_tags_for_assets(
    conn: &Connection,
    asset_ids: &[i64],
) -> rusqlite::Result<AssetGroups<Tag>> {
    collect_asset_rows(
        conn,
        asset_ids,
        |placeholders| {
            format!(
                "SELECT at.asset_id, t.id, t.name, t.color, t.sort_order
             FROM asset_tags at
             INNER JOIN tags t ON t.id = at.tag_id
             WHERE at.asset_id IN ({placeholders})
             ORDER BY at.asset_id, t.sort_order ASC, t.name COLLATE NOCASE"
            )
        },
        tag_for_asset_from_row,
    )
}

fn list_links_for_assets(
    conn: &Connection,
    asset_ids: &[i64],
) -> rusqlite::Result<AssetGroups<AssetLink>> {
    collect_asset_rows(
        conn,
        asset_ids,
        |placeholders| {
            format!(
                "SELECT asset_id, id, label, url, sort_order
             FROM asset_links
             WHERE asset_id IN ({placeholders})
             ORDER BY asset_id, sort_order ASC, id ASC"
            )
        },
        link_for_asset_from_row,
    )
}

fn hydrate_asset(conn: &Connection, base: AssetBase) -> rusqlite::Result<Asset> {
    let models = list_models_for_asset(conn, base.id)?;
    let tags = list_tags_for_asset(conn, base.id)?;
    let related_links = list_links_for_asset(conn, base.id)?;
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
        related_links,
        file_exists,
    })
}

fn hydrate_assets(conn: &Connection, bases: Vec<AssetBase>) -> rusqlite::Result<Vec<Asset>> {
    let asset_ids = bases.iter().map(|base| base.id).collect::<Vec<_>>();
    let mut models = list_models_for_assets(conn, &asset_ids)?;
    let mut tags = list_tags_for_assets(conn, &asset_ids)?;
    let mut links = list_links_for_assets(conn, &asset_ids)?;
    let mut assets = Vec::with_capacity(bases.len());

    for base in bases {
        let file_exists = Path::new(&base.file_path).exists();
        assets.push(Asset {
            id: base.id,
            name: base.name,
            display_name: base.display_name,
            file_path: base.file_path,
            booth_url: base.booth_url,
            thumbnail_url: base.thumbnail_url,
            note: base.note,
            created_at: base.created_at,
            updated_at: base.updated_at,
            models: models.remove(&base.id).unwrap_or_default(),
            tags: tags.remove(&base.id).unwrap_or_default(),
            related_links: links.remove(&base.id).unwrap_or_default(),
            file_exists,
        });
    }

    Ok(assets)
}

fn push_health_issue(
    summary: &mut AssetHealthSummary,
    base: &AssetBase,
    status: &str,
    message: impl Into<String>,
) {
    summary.issues.push(AssetHealthIssue {
        asset_id: base.id,
        name: base.name.clone(),
        display_name: base.display_name.clone(),
        file_path: base.file_path.clone(),
        status: status.to_string(),
        message: message.into(),
    });
}

fn record_health_issue(
    summary: &mut AssetHealthSummary,
    base: &AssetBase,
    status: HealthStatus,
    message: impl Into<String>,
) {
    match status {
        HealthStatus::Missing => summary.missing += 1,
        HealthStatus::Unreadable => summary.unreadable += 1,
        HealthStatus::EmptyFile => summary.empty_files += 1,
        HealthStatus::EmptyDirectory => summary.empty_directories += 1,
        HealthStatus::Unsupported => summary.unsupported += 1,
    }

    push_health_issue(summary, base, status.as_str(), message);
}

fn scan_regular_file(summary: &mut AssetHealthSummary, base: &AssetBase, path: &Path, len: u64) {
    if fs::File::open(path).is_err() {
        record_health_issue(
            summary,
            base,
            HealthStatus::Unreadable,
            "File cannot be opened",
        );
        return;
    }

    if len == 0 {
        record_health_issue(summary, base, HealthStatus::EmptyFile, "File is empty");
        return;
    }

    summary.ok += 1;
}

fn scan_directory(summary: &mut AssetHealthSummary, base: &AssetBase, path: &Path) {
    match fs::read_dir(path) {
        Ok(mut entries) => {
            if entries.next().is_none() {
                record_health_issue(
                    summary,
                    base,
                    HealthStatus::EmptyDirectory,
                    "Directory is empty",
                );
            } else {
                summary.ok += 1;
            }
        }
        Err(error) => {
            record_health_issue(summary, base, HealthStatus::Unreadable, error.to_string())
        }
    }
}

fn scan_asset_path(summary: &mut AssetHealthSummary, base: &AssetBase) {
    let path = Path::new(&base.file_path);

    if !path.exists() {
        record_health_issue(summary, base, HealthStatus::Missing, "Path does not exist");
        return;
    }

    let metadata = match fs::metadata(path) {
        Ok(metadata) => metadata,
        Err(error) => {
            record_health_issue(summary, base, HealthStatus::Unreadable, error.to_string());
            return;
        }
    };

    if metadata.is_file() {
        scan_regular_file(summary, base, path, metadata.len());
        return;
    }

    if metadata.is_dir() {
        scan_directory(summary, base, path);
        return;
    }

    record_health_issue(
        summary,
        base,
        HealthStatus::Unsupported,
        "Path exists but is not a regular file or directory",
    );
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

fn insert_asset_links(
    tx: &Transaction<'_>,
    asset_id: i64,
    links: &[AssetLinkInput],
) -> rusqlite::Result<()> {
    let cleaned_links = normalize_asset_links(links);
    let mut stmt = tx.prepare(
        "INSERT INTO asset_links (asset_id, label, url, sort_order)
         VALUES (?, ?, ?, ?)",
    )?;

    for (index, link) in cleaned_links.iter().enumerate() {
        stmt.execute(params![asset_id, &link.label, &link.url, index as i64 + 1])?;
    }

    Ok(())
}

fn replace_asset_relations(
    tx: &Transaction<'_>,
    asset_id: i64,
    model_ids: &[i64],
    tag_ids: &[i64],
    related_links: &[AssetLinkInput],
) -> rusqlite::Result<()> {
    tx.execute(
        "DELETE FROM asset_models WHERE asset_id = ?",
        params![asset_id],
    )?;
    tx.execute(
        "DELETE FROM asset_tags WHERE asset_id = ?",
        params![asset_id],
    )?;
    tx.execute(
        "DELETE FROM asset_links WHERE asset_id = ?",
        params![asset_id],
    )?;
    insert_asset_models(tx, asset_id, model_ids)?;
    insert_asset_tags(tx, asset_id, tag_ids)?;
    insert_asset_links(tx, asset_id, related_links)?;
    Ok(())
}

fn resolve_thumbnail(booth_url: &Option<String>, thumbnail_url: Option<String>) -> Option<String> {
    match (thumbnail_url, booth_url) {
        (Some(thumbnail), _) => Some(thumbnail),
        (None, Some(url)) => booth::fetch_thumbnail_url(url).ok().flatten(),
        (None, None) => None,
    }
}

fn list_asset_bases(
    conn: &Connection,
    sql: &str,
    values: &[Value],
) -> CommandResult<Vec<AssetBase>> {
    let mut stmt = conn.prepare(sql).map_err(db_error)?;
    let rows = stmt
        .query_map(params_from_iter(values.iter()), asset_base_from_row)
        .map_err(db_error)?;

    rows.collect::<rusqlite::Result<Vec<_>>>().map_err(db_error)
}

#[tauri::command]
pub fn get_assets(filters: AssetFilters, db: State<'_, DbState>) -> CommandResult<Vec<Asset>> {
    let conn = connection(&db)?;
    let (sql, values) = AssetListQuery::new(&filters).into_parts();
    let bases = list_asset_bases(&conn, &sql, &values)?;
    hydrate_assets(&conn, bases).map_err(db_error)
}

#[tauri::command]
pub fn scan_asset_health(db: State<'_, DbState>) -> CommandResult<AssetHealthSummary> {
    let conn = connection(&db)?;
    let bases = {
        let mut stmt = conn
            .prepare(
                "SELECT id, name, display_name, file_path, booth_url, thumbnail_url, note, created_at, updated_at
                 FROM assets
                 ORDER BY id",
            )
            .map_err(db_error)?;
        let rows = stmt.query_map([], asset_base_from_row).map_err(db_error)?;
        rows.collect::<rusqlite::Result<Vec<_>>>()
            .map_err(db_error)?
    };

    let mut summary = AssetHealthSummary {
        total: bases.len(),
        ok: 0,
        missing: 0,
        unreadable: 0,
        empty_files: 0,
        empty_directories: 0,
        unsupported: 0,
        issues: Vec::new(),
    };

    for base in &bases {
        scan_asset_path(&mut summary, base);
    }

    Ok(summary)
}

#[tauri::command]
pub fn create_asset(input: CreateAssetInput, db: State<'_, DbState>) -> CommandResult<Asset> {
    let file_path = require_trimmed(&input.file_path, "File path is required")?;
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
    insert_asset_links(&tx, id, &input.related_links).map_err(db_error)?;
    tx.commit().map_err(db_error)?;

    get_asset_by_id(&conn, id).map_err(db_error)
}

#[tauri::command]
pub fn update_asset(
    id: i64,
    input: UpdateAssetInput,
    db: State<'_, DbState>,
) -> CommandResult<Asset> {
    let file_path = require_trimmed(&input.file_path, "File path is required")?;
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

    ensure_affected(affected, "Asset was not found")?;

    replace_asset_relations(
        &tx,
        id,
        &input.model_ids,
        &input.tag_ids,
        &input.related_links,
    )
    .map_err(db_error)?;
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

#[cfg(target_os = "windows")]
fn open_folder(path: &Path) -> CommandResult<()> {
    Command::new("explorer")
        .arg(path.as_os_str())
        .spawn()
        .map_err(db_error)?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn open_folder(path: &Path) -> CommandResult<()> {
    Command::new("open")
        .arg(path.as_os_str())
        .spawn()
        .map_err(db_error)?;
    Ok(())
}

#[cfg(all(unix, not(target_os = "macos")))]
fn open_folder(path: &Path) -> CommandResult<()> {
    Command::new("xdg-open")
        .arg(path.as_os_str())
        .spawn()
        .map_err(db_error)?;
    Ok(())
}

#[cfg(not(any(target_os = "windows", unix)))]
fn open_folder(_path: &Path) -> CommandResult<()> {
    Err("Opening folders is not supported on this platform".to_string())
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

    open_folder(&open_target)
}
