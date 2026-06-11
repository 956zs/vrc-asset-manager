use crate::{
    db::DbState,
    types::{
        Asset, AssetCategory, AssetFilters, AssetLink, AssetLinkInput, CreateAssetInput, Model,
        Tag, UpdateAssetInput,
    },
};
use rusqlite::{params, params_from_iter, types::Value, Connection, Row, Transaction};
use serde::{Deserialize, Serialize};
#[cfg(any(target_os = "windows", unix))]
use std::process::Command;
use std::{
    collections::BTreeMap,
    fs, io,
    path::{Path, PathBuf},
};
use tauri::State;

use super::{
    booth, connection, db_error, ensure_affected, models::list_models_for_asset,
    normalize_optional, require_trimmed, tags::list_tags_for_asset, CommandResult,
};

const SQL_PARAM_BATCH_SIZE: usize = 900;
const ASSET_SEARCH_PARAM_COUNT: usize = 5;
const LIBRARY_SETTINGS_ID: i64 = 1;
const SOURCE_CONTENT_PREVIEW_LIMIT: usize = 200;
type AssetGroups<T> = BTreeMap<i64, Vec<T>>;

const ASSET_LIST_BASE_SQL: &str = "SELECT a.id, a.name, a.display_name, a.category, a.file_path, a.booth_url, a.thumbnail_url, a.note, a.created_at, a.updated_at
         FROM assets a
         WHERE 1 = 1";

#[derive(Debug)]
struct AssetBase {
    id: i64,
    name: String,
    display_name: Option<String>,
    category: AssetCategory,
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
        query.push_category_filter(filters.category);
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

    fn push_category_filter(&mut self, category: Option<AssetCategory>) {
        let Some(category) = category else {
            return;
        };

        self.sql.push_str(" AND a.category = ?");
        self.values.push(Value::Text(category.as_str().to_string()));
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
    let category_text: String = row.get(3)?;
    Ok(AssetBase {
        id: row.get(0)?,
        name: row.get(1)?,
        display_name: row.get(2)?,
        category: category_text.parse().unwrap_or_default(),
        file_path: row.get(4)?,
        booth_url: row.get(5)?,
        thumbnail_url: row.get(6)?,
        note: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibrarySettings {
    pub root_path: Option<String>,
    pub avatar_folder: String,
    pub accessory_folder: String,
    pub world_folder: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLibrarySettingsInput {
    pub root_path: Option<String>,
    pub avatar_folder: String,
    pub accessory_folder: String,
    pub world_folder: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ImportOperation {
    Move,
    Copy,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ArchiveStrategy {
    KeepArchive,
    Extract,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ConflictStrategy {
    Cancel,
    Rename,
    Overwrite,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ImportSourceKind {
    Folder,
    Zip,
    UnityPackage,
    Unsupported,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSourceInfo {
    pub source_path: String,
    pub name: String,
    pub kind: ImportSourceKind,
    pub supported: bool,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportTargetPreview {
    pub source_path: String,
    pub target_path: Option<String>,
    pub conflict: bool,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ZipContentList {
    pub source_path: String,
    pub file_count: usize,
    pub paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceContentList {
    pub source_path: String,
    pub kind: ImportSourceKind,
    pub file_count: usize,
    pub paths: Vec<String>,
    pub truncated: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedImportItemInput {
    pub source_path: String,
    pub category: AssetCategory,
    pub operation: ImportOperation,
    #[serde(default)]
    pub archive_strategy: Option<ArchiveStrategy>,
    #[serde(default)]
    pub conflict_strategy: Option<ConflictStrategy>,
    pub display_name: Option<String>,
    pub booth_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub note: Option<String>,
    #[serde(default)]
    pub model_ids: Vec<i64>,
    #[serde(default)]
    pub tag_ids: Vec<i64>,
    #[serde(default)]
    pub related_links: Vec<AssetLinkInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedImportBatchInput {
    #[serde(default)]
    pub items: Vec<ManagedImportItemInput>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedImportItemResult {
    pub source_path: String,
    pub success: bool,
    pub asset: Option<Asset>,
    pub final_path: Option<String>,
    pub operation: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedImportBatchReport {
    pub total: usize,
    pub succeeded: usize,
    pub failed: usize,
    pub results: Vec<ManagedImportItemResult>,
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
        category: base.category,
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
            category: base.category,
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
        "SELECT id, name, display_name, category, file_path, booth_url, thumbnail_url, note, created_at, updated_at
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

fn library_settings_from_row(row: &Row<'_>) -> rusqlite::Result<LibrarySettings> {
    Ok(LibrarySettings {
        root_path: row.get(0)?,
        avatar_folder: row.get(1)?,
        accessory_folder: row.get(2)?,
        world_folder: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

fn get_library_settings_from_conn(conn: &Connection) -> rusqlite::Result<LibrarySettings> {
    conn.query_row(
        "SELECT root_path, avatar_folder, accessory_folder, world_folder, updated_at
         FROM library_settings
         WHERE id = ?",
        params![LIBRARY_SETTINGS_ID],
        library_settings_from_row,
    )
}

fn category_folder_name(settings: &LibrarySettings, category: AssetCategory) -> &str {
    match category {
        AssetCategory::Avatar => &settings.avatar_folder,
        AssetCategory::Accessory => &settings.accessory_folder,
        AssetCategory::World => &settings.world_folder,
    }
}

fn require_library_root(settings: &LibrarySettings) -> CommandResult<PathBuf> {
    let Some(root_path) = settings
        .root_path
        .as_deref()
        .map(str::trim)
        .filter(|path| !path.is_empty())
    else {
        return Err("請先設定素材庫根目錄".to_string());
    };

    Ok(PathBuf::from(root_path))
}

fn ensure_category_folders(root: &Path, settings: &LibrarySettings) -> CommandResult<()> {
    for folder in [
        &settings.avatar_folder,
        &settings.accessory_folder,
        &settings.world_folder,
    ] {
        fs::create_dir_all(root.join(folder)).map_err(db_error)?;
    }

    Ok(())
}

fn normalize_folder_name(value: &str, fallback: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        fallback.to_string()
    } else {
        trimmed.to_string()
    }
}

fn normalized_library_settings_input(
    input: UpdateLibrarySettingsInput,
) -> UpdateLibrarySettingsInput {
    UpdateLibrarySettingsInput {
        root_path: input
            .root_path
            .and_then(|path| normalize_optional(Some(path))),
        avatar_folder: normalize_folder_name(&input.avatar_folder, "素體"),
        accessory_folder: normalize_folder_name(&input.accessory_folder, "素體配件"),
        world_folder: normalize_folder_name(&input.world_folder, "世界"),
    }
}

fn source_kind(path: &Path) -> ImportSourceKind {
    if path.is_dir() {
        return ImportSourceKind::Folder;
    }

    if !path.is_file() {
        return ImportSourceKind::Unsupported;
    }

    match path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
        .as_deref()
    {
        Some("zip") => ImportSourceKind::Zip,
        Some("unitypackage") => ImportSourceKind::UnityPackage,
        _ => ImportSourceKind::Unsupported,
    }
}

fn import_source_info_for(path: &Path) -> ImportSourceInfo {
    let kind = source_kind(path);
    let source_path = path.to_string_lossy().to_string();
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or(&source_path)
        .to_string();
    let supported = kind != ImportSourceKind::Unsupported;
    let message = if path.exists() {
        match kind {
            ImportSourceKind::Unsupported => {
                Some("第一版只支援資料夾、.zip、.unitypackage".to_string())
            }
            _ => None,
        }
    } else {
        Some("來源路徑不存在".to_string())
    };

    ImportSourceInfo {
        source_path,
        name,
        kind,
        supported: supported && path.exists(),
        message,
    }
}

fn archive_strategy_for(
    kind: &ImportSourceKind,
    strategy: Option<ArchiveStrategy>,
) -> ArchiveStrategy {
    if *kind == ImportSourceKind::Zip {
        strategy.unwrap_or(ArchiveStrategy::KeepArchive)
    } else {
        ArchiveStrategy::KeepArchive
    }
}

fn target_name_for(path: &Path, kind: &ImportSourceKind, strategy: ArchiveStrategy) -> String {
    if *kind == ImportSourceKind::Zip && strategy == ArchiveStrategy::Extract {
        return path
            .file_stem()
            .and_then(|name| name.to_str())
            .filter(|name| !name.trim().is_empty())
            .unwrap_or("extracted-zip")
            .to_string();
    }

    path.file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or("asset")
        .to_string()
}

fn base_target_path(
    settings: &LibrarySettings,
    source: &Path,
    category: AssetCategory,
    strategy: ArchiveStrategy,
) -> CommandResult<PathBuf> {
    let root = require_library_root(settings)?;
    let kind = source_kind(source);
    let folder = category_folder_name(settings, category);
    Ok(root
        .join(folder)
        .join(target_name_for(source, &kind, strategy)))
}

fn unique_target_path(path: &Path) -> PathBuf {
    if !path.exists() {
        return path.to_path_buf();
    }

    let parent = path.parent().unwrap_or_else(|| Path::new(""));
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("asset");
    let extension = path.extension().and_then(|value| value.to_str());

    for index in 1..10_000 {
        let file_name = match extension {
            Some(extension) if !extension.is_empty() => format!("{stem} ({index}).{extension}"),
            _ => format!("{stem} ({index})"),
        };
        let candidate = parent.join(file_name);
        if !candidate.exists() {
            return candidate;
        }
    }

    path.to_path_buf()
}

fn prepare_target_path(path: &Path, strategy: ConflictStrategy) -> CommandResult<PathBuf> {
    if !path.exists() {
        return Ok(path.to_path_buf());
    }

    match strategy {
        ConflictStrategy::Cancel => Err("目標路徑已存在，請選擇覆蓋、改名或取消".to_string()),
        ConflictStrategy::Rename => Ok(unique_target_path(path)),
        ConflictStrategy::Overwrite => {
            if path.is_dir() {
                fs::remove_dir_all(path).map_err(db_error)?;
            } else {
                fs::remove_file(path).map_err(db_error)?;
            }
            Ok(path.to_path_buf())
        }
    }
}

fn copy_dir_recursive(source: &Path, destination: &Path) -> io::Result<()> {
    fs::create_dir_all(destination)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        let metadata = entry.metadata()?;
        if metadata.is_dir() {
            copy_dir_recursive(&source_path, &destination_path)?;
        } else if metadata.is_file() {
            if let Some(parent) = destination_path.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::copy(&source_path, &destination_path)?;
        }
    }
    Ok(())
}

fn remove_source_path(path: &Path) -> CommandResult<()> {
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(db_error)
    } else {
        fs::remove_file(path).map_err(db_error)
    }
}

fn move_or_copy_path(
    source: &Path,
    destination: &Path,
    operation: ImportOperation,
) -> CommandResult<()> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(db_error)?;
    }

    match operation {
        ImportOperation::Copy => {
            if source.is_dir() {
                copy_dir_recursive(source, destination).map_err(db_error)?;
            } else {
                fs::copy(source, destination).map_err(db_error)?;
            }
        }
        ImportOperation::Move => {
            if fs::rename(source, destination).is_err() {
                if source.is_dir() {
                    copy_dir_recursive(source, destination).map_err(db_error)?;
                } else {
                    fs::copy(source, destination).map_err(db_error)?;
                }
                remove_source_path(source)?;
            }
        }
    }

    Ok(())
}

fn is_ignored_zip_entry(path: &str) -> bool {
    let trimmed = path.trim_end_matches('/');
    trimmed.ends_with(".DS_Store")
        || trimmed.ends_with("Thumbs.db")
        || trimmed.ends_with("__MACOSX")
}

fn safe_zip_entry_path(enclosed_name: &Path) -> bool {
    !enclosed_name.components().any(|component| {
        matches!(
            component,
            std::path::Component::ParentDir
                | std::path::Component::RootDir
                | std::path::Component::Prefix(_)
        )
    })
}

fn extract_zip(source: &Path, destination: &Path) -> CommandResult<()> {
    fs::create_dir_all(destination).map_err(db_error)?;
    let file = fs::File::open(source).map_err(db_error)?;
    let mut archive = zip::ZipArchive::new(file).map_err(db_error)?;

    for index in 0..archive.len() {
        let mut file = archive.by_index(index).map_err(db_error)?;
        let Some(enclosed_name) = file.enclosed_name() else {
            continue;
        };
        if !safe_zip_entry_path(&enclosed_name) {
            continue;
        }
        let output_path = destination.join(enclosed_name);
        if file.is_dir() {
            fs::create_dir_all(&output_path).map_err(db_error)?;
        } else {
            if let Some(parent) = output_path.parent() {
                fs::create_dir_all(parent).map_err(db_error)?;
            }
            let mut output = fs::File::create(&output_path).map_err(db_error)?;
            io::copy(&mut file, &mut output).map_err(db_error)?;
        }
    }

    Ok(())
}

fn is_visible_child(path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
        return false;
    };

    !matches!(name, ".DS_Store" | "Thumbs.db" | "__MACOSX")
}

fn flatten_single_outer_folder(destination: &Path) -> CommandResult<()> {
    let entries = fs::read_dir(destination)
        .map_err(db_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_error)?;
    let visible = entries
        .iter()
        .filter(|entry| is_visible_child(&entry.path()))
        .collect::<Vec<_>>();

    if visible.len() != 1 || !visible[0].path().is_dir() {
        return Ok(());
    }

    let child_dir = visible[0].path();
    let child_entries = fs::read_dir(&child_dir)
        .map_err(db_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_error)?;

    for entry in child_entries {
        let target = destination.join(entry.file_name());
        if target.exists() {
            return Ok(());
        }
    }

    for entry in fs::read_dir(&child_dir).map_err(db_error)? {
        let entry = entry.map_err(db_error)?;
        fs::rename(entry.path(), destination.join(entry.file_name())).map_err(db_error)?;
    }
    let _ = fs::remove_dir(&child_dir);

    Ok(())
}

fn import_zip_extract(
    source: &Path,
    destination: &Path,
    operation: ImportOperation,
) -> CommandResult<()> {
    extract_zip(source, destination)?;
    let _ = flatten_single_outer_folder(destination);
    if operation == ImportOperation::Move {
        fs::remove_file(source).map_err(db_error)?;
    }
    Ok(())
}

fn insert_asset_record(conn: &mut Connection, input: CreateAssetInput) -> CommandResult<Asset> {
    let file_path = require_trimmed(&input.file_path, "File path is required")?;
    let name = asset_name_from_path(&file_path);
    let display_name = normalize_optional(input.display_name);
    let booth_url = normalize_optional(input.booth_url);
    let thumbnail_url = resolve_thumbnail(&booth_url, normalize_optional(input.thumbnail_url));
    let note = normalize_optional(input.note);

    let tx = conn.transaction().map_err(db_error)?;
    tx.execute(
        "INSERT INTO assets (name, display_name, category, file_path, booth_url, thumbnail_url, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![
            name,
            display_name,
            input.category.as_str(),
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

    get_asset_by_id(conn, id).map_err(db_error)
}

#[tauri::command]
pub fn get_assets(filters: AssetFilters, db: State<'_, DbState>) -> CommandResult<Vec<Asset>> {
    let conn = connection(&db)?;
    let (sql, values) = AssetListQuery::new(&filters).into_parts();
    let bases = list_asset_bases(&conn, &sql, &values)?;
    hydrate_assets(&conn, bases).map_err(db_error)
}

#[tauri::command]
pub fn get_library_settings(db: State<'_, DbState>) -> CommandResult<LibrarySettings> {
    let conn = connection(&db)?;
    get_library_settings_from_conn(&conn).map_err(db_error)
}

#[tauri::command]
pub fn configure_library_root(
    root_path: String,
    db: State<'_, DbState>,
) -> CommandResult<LibrarySettings> {
    let root_path = require_trimmed(&root_path, "素材庫根目錄是必填欄位")?;

    let conn = connection(&db)?;
    conn.execute(
        "UPDATE library_settings
         SET root_path = ?, updated_at = datetime('now')
         WHERE id = ?",
        params![root_path, LIBRARY_SETTINGS_ID],
    )
    .map_err(db_error)?;

    get_library_settings_from_conn(&conn).map_err(db_error)
}

#[tauri::command]
pub fn update_library_settings(
    input: UpdateLibrarySettingsInput,
    db: State<'_, DbState>,
) -> CommandResult<LibrarySettings> {
    let input = normalized_library_settings_input(input);
    let conn = connection(&db)?;
    conn.execute(
        "UPDATE library_settings
         SET root_path = ?, avatar_folder = ?, accessory_folder = ?, world_folder = ?, updated_at = datetime('now')
         WHERE id = ?",
        params![
            input.root_path,
            input.avatar_folder,
            input.accessory_folder,
            input.world_folder,
            LIBRARY_SETTINGS_ID
        ],
    )
    .map_err(db_error)?;

    get_library_settings_from_conn(&conn).map_err(db_error)
}

#[tauri::command]
pub fn inspect_import_sources(paths: Vec<String>) -> Vec<ImportSourceInfo> {
    paths
        .iter()
        .map(|path| import_source_info_for(Path::new(path)))
        .collect()
}

#[tauri::command]
pub fn preview_managed_import_target(
    source_path: String,
    category: AssetCategory,
    archive_strategy: Option<ArchiveStrategy>,
    db: State<'_, DbState>,
) -> CommandResult<ImportTargetPreview> {
    let conn = connection(&db)?;
    let settings = get_library_settings_from_conn(&conn).map_err(db_error)?;
    let source = PathBuf::from(&source_path);
    let info = import_source_info_for(&source);
    if !info.supported {
        return Ok(ImportTargetPreview {
            source_path,
            target_path: None,
            conflict: false,
            message: info.message,
        });
    }

    let strategy = archive_strategy_for(&info.kind, archive_strategy);
    let target = base_target_path(&settings, &source, category, strategy)?;
    Ok(ImportTargetPreview {
        source_path,
        conflict: target.exists(),
        target_path: Some(target.to_string_lossy().to_string()),
        message: None,
    })
}

#[tauri::command]
pub fn list_zip_contents(source_path: String) -> CommandResult<ZipContentList> {
    let path = PathBuf::from(&source_path);
    if source_kind(&path) != ImportSourceKind::Zip {
        return Err("只有 .zip 可以列出內容".to_string());
    }

    let file = fs::File::open(&path).map_err(db_error)?;
    let mut archive = zip::ZipArchive::new(file).map_err(db_error)?;
    let mut paths = Vec::new();
    for index in 0..archive.len() {
        let file = archive.by_index(index).map_err(db_error)?;
        if file.is_dir() {
            continue;
        }
        let name = file.name().replace('\\', "/");
        if is_ignored_zip_entry(&name) {
            continue;
        }
        paths.push(name);
    }
    paths.sort();

    Ok(ZipContentList {
        source_path,
        file_count: paths.len(),
        paths,
    })
}

fn directory_entry_label(root: &Path, path: &Path, is_dir: bool) -> Option<String> {
    let relative = path.strip_prefix(root).ok()?;
    let mut label = relative.to_string_lossy().replace('\\', "/");
    if is_dir && !label.ends_with('/') {
        label.push('/');
    }
    (!label.is_empty()).then_some(label)
}

fn collect_directory_contents(
    root: &Path,
    current: &Path,
    paths: &mut Vec<String>,
) -> io::Result<bool> {
    let mut entries = fs::read_dir(current)?.collect::<Result<Vec<_>, _>>()?;
    entries.sort_by_key(|entry| entry.file_name());

    for entry in entries {
        let path = entry.path();
        let file_type = entry.file_type()?;
        if let Some(label) = directory_entry_label(root, &path, file_type.is_dir()) {
            paths.push(label);
            if paths.len() >= SOURCE_CONTENT_PREVIEW_LIMIT {
                return Ok(true);
            }
        }

        if file_type.is_dir() && collect_directory_contents(root, &path, paths)? {
            return Ok(true);
        }
    }

    Ok(false)
}

#[tauri::command]
pub fn list_import_source_contents(source_path: String) -> CommandResult<SourceContentList> {
    let path = PathBuf::from(&source_path);
    let kind = source_kind(&path);

    match kind {
        ImportSourceKind::Folder => {
            let mut paths = Vec::new();
            let truncated =
                collect_directory_contents(&path, &path, &mut paths).map_err(db_error)?;
            Ok(SourceContentList {
                source_path,
                kind,
                file_count: paths.len(),
                paths,
                truncated,
            })
        }
        ImportSourceKind::Zip => {
            let contents = list_zip_contents(source_path)?;
            Ok(SourceContentList {
                source_path: contents.source_path,
                kind,
                file_count: contents.file_count,
                paths: contents.paths,
                truncated: false,
            })
        }
        ImportSourceKind::UnityPackage => {
            Err(".unitypackage 會作為受管理檔案，不解析內容".to_string())
        }
        ImportSourceKind::Unsupported => Err("第一版只支援檢視資料夾與 .zip 內容".to_string()),
    }
}

fn managed_import_item(
    conn: &mut Connection,
    settings: &LibrarySettings,
    item: ManagedImportItemInput,
) -> ManagedImportItemResult {
    let source = PathBuf::from(item.source_path.trim());
    let source_path = source.to_string_lossy().to_string();
    let operation_label = match item.operation {
        ImportOperation::Move => "move",
        ImportOperation::Copy => "copy",
    }
    .to_string();

    let run = || -> Result<(Asset, String), (String, Option<String>)> {
        let info = import_source_info_for(&source);
        if !info.supported {
            return Err((
                info.message
                    .unwrap_or_else(|| "不支援的導入來源".to_string()),
                None,
            ));
        }

        let root = require_library_root(settings).map_err(|message| (message, None))?;
        ensure_category_folders(&root, settings).map_err(|message| (message, None))?;
        let strategy = archive_strategy_for(&info.kind, item.archive_strategy);
        let base_target = base_target_path(settings, &source, item.category, strategy)
            .map_err(|message| (message, None))?;
        let conflict_strategy = item.conflict_strategy.unwrap_or(ConflictStrategy::Cancel);
        let final_target = prepare_target_path(&base_target, conflict_strategy)
            .map_err(|message| (message, None))?;

        if info.kind == ImportSourceKind::Zip && strategy == ArchiveStrategy::Extract {
            import_zip_extract(&source, &final_target, item.operation)
                .map_err(|message| (message, None))?;
        } else {
            move_or_copy_path(&source, &final_target, item.operation)
                .map_err(|message| (message, None))?;
        }

        let final_path = final_target.to_string_lossy().to_string();
        let asset = insert_asset_record(
            conn,
            CreateAssetInput {
                display_name: item.display_name,
                category: item.category,
                file_path: final_path.clone(),
                booth_url: item.booth_url,
                thumbnail_url: item.thumbnail_url,
                note: item.note,
                model_ids: item.model_ids,
                tag_ids: item.tag_ids,
                related_links: item.related_links,
            },
        )
        .map_err(|message| {
            (
                format!("檔案已處理，但資料庫記錄建立失敗：{message}"),
                Some(final_path.clone()),
            )
        })?;
        Ok((asset, final_path))
    };

    match run() {
        Ok((asset, final_path)) => ManagedImportItemResult {
            source_path,
            success: true,
            asset: Some(asset),
            final_path: Some(final_path),
            operation: operation_label,
            message: "導入完成".to_string(),
        },
        Err((message, final_path)) => ManagedImportItemResult {
            source_path,
            success: false,
            asset: None,
            final_path,
            operation: operation_label,
            message,
        },
    }
}

#[tauri::command]
pub fn managed_import_batch(
    input: ManagedImportBatchInput,
    db: State<'_, DbState>,
) -> CommandResult<ManagedImportBatchReport> {
    let mut conn = connection(&db)?;
    let settings = get_library_settings_from_conn(&conn).map_err(db_error)?;
    let total = input.items.len();
    let results = input
        .items
        .into_iter()
        .map(|item| managed_import_item(&mut conn, &settings, item))
        .collect::<Vec<_>>();
    let succeeded = results.iter().filter(|result| result.success).count();

    Ok(ManagedImportBatchReport {
        total,
        succeeded,
        failed: total.saturating_sub(succeeded),
        results,
    })
}

#[tauri::command]
pub fn scan_asset_health(db: State<'_, DbState>) -> CommandResult<AssetHealthSummary> {
    let conn = connection(&db)?;
    let bases = {
        let mut stmt = conn
            .prepare(
                "SELECT id, name, display_name, category, file_path, booth_url, thumbnail_url, note, created_at, updated_at
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
    let mut conn = connection(&db)?;
    insert_asset_record(&mut conn, input)
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
             SET name = ?, display_name = ?, category = ?, file_path = ?, booth_url = ?, thumbnail_url = ?, note = ?, updated_at = datetime('now')
             WHERE id = ?",
            params![
                name,
                display_name,
                input.category.as_str(),
                file_path,
                booth_url,
                thumbnail_url,
                note,
                id
            ],
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
