use crate::{
    db::{ensure_vcc_repositories, DbState},
    types::VccProjectSnapshot,
};
use rusqlite::{params, Connection, Row, Transaction};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::State;

use super::vcc::{snapshot_vcc_projects, vcc_app_data_dir};
use super::{connection, db_error, CommandResult};

const SAVE_SCHEMA_VERSION: u32 = 1;
const VCC_BACKUP_SCHEMA_VERSION: u32 = 1;
const EXPORT_MODELS_SQL: &str =
    "SELECT id, name, display_name, sort_order, created_at FROM models ORDER BY sort_order, id";
const EXPORT_TAGS_SQL: &str =
    "SELECT id, name, color, sort_order FROM tags ORDER BY sort_order, id";
const EXPORT_ASSETS_SQL: &str = "SELECT id, name, display_name, file_path, booth_url, thumbnail_url, note, created_at, updated_at
             FROM assets
             ORDER BY id";
const EXPORT_ASSETS_WITH_CATEGORY_SQL: &str = "SELECT id, name, display_name, category, file_path, booth_url, thumbnail_url, note, created_at, updated_at
             FROM assets
             ORDER BY id";
const EXPORT_ASSET_MODELS_SQL: &str =
    "SELECT asset_id, model_id FROM asset_models ORDER BY asset_id, model_id";
const EXPORT_ASSET_TAGS_SQL: &str =
    "SELECT asset_id, tag_id FROM asset_tags ORDER BY asset_id, tag_id";
const EXPORT_ASSET_LINKS_SQL: &str = "SELECT id, asset_id, label, url, sort_order
             FROM asset_links
             ORDER BY asset_id, sort_order, id";
const EXPORT_VCC_PROJECTS_SQL: &str = "SELECT id, name, path, created_at, updated_at
             FROM vcc_projects
             ORDER BY name COLLATE NOCASE, path COLLATE NOCASE";
const EXPORT_VCC_REPOSITORIES_SQL: &str = "SELECT id, name, url, created_at, updated_at
             FROM vcc_repositories
             ORDER BY name COLLATE NOCASE, url COLLATE NOCASE";

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveModel {
    id: i64,
    name: String,
    display_name: Option<String>,
    #[serde(default)]
    sort_order: i64,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveTag {
    id: i64,
    name: String,
    color: String,
    #[serde(default)]
    sort_order: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveAsset {
    id: i64,
    name: String,
    display_name: Option<String>,
    #[serde(default = "default_asset_category")]
    category: String,
    file_path: String,
    booth_url: Option<String>,
    thumbnail_url: Option<String>,
    note: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SaveLibrarySettings {
    root_path: Option<String>,
    avatar_folder: String,
    accessory_folder: String,
    world_folder: String,
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
struct SaveAssetLink {
    id: i64,
    asset_id: i64,
    label: String,
    url: String,
    #[serde(default)]
    sort_order: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveVccProject {
    id: i64,
    name: String,
    path: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveVccRepository {
    id: i64,
    name: String,
    url: String,
    created_at: String,
    updated_at: String,
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
    #[serde(default)]
    asset_links: Vec<SaveAssetLink>,
    #[serde(default)]
    vcc_projects: Vec<SaveVccProject>,
    #[serde(default)]
    vcc_repositories: Vec<SaveVccRepository>,
    #[serde(default)]
    vcc_project_snapshots: Vec<VccProjectSnapshot>,
    #[serde(default)]
    library_settings: Option<SaveLibrarySettings>,
}

#[derive(Debug, Clone)]
struct VccBackupResult {
    path: String,
    files: usize,
    cached_repositories: usize,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
struct VccLocalBackup {
    app_data_path: Option<String>,
    copied_files: Vec<String>,
    settings_copied: bool,
    cached_repositories: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct VccBackupManifest<'a> {
    schema_version: u32,
    app: &'static str,
    exported_at: &'a str,
    restore_note: &'static str,
    vcc_projects: &'a [SaveVccProject],
    vcc_repositories: &'a [SaveVccRepository],
    vcc_project_snapshots: &'a [VccProjectSnapshot],
    local_vcc: VccLocalBackup,
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
    pub asset_links: usize,
    pub vcc_projects: usize,
    pub vcc_repositories: usize,
    pub vcc_backup_path: Option<String>,
    pub vcc_backup_files: usize,
    pub vcc_cached_repositories: usize,
}

fn model_from_row(row: &Row<'_>) -> rusqlite::Result<SaveModel> {
    Ok(SaveModel {
        id: row.get(0)?,
        name: row.get(1)?,
        display_name: row.get(2)?,
        sort_order: row.get(3)?,
        created_at: row.get(4)?,
    })
}

fn tag_from_row(row: &Row<'_>) -> rusqlite::Result<SaveTag> {
    Ok(SaveTag {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
        sort_order: row.get(3)?,
    })
}

fn asset_from_row(row: &Row<'_>) -> rusqlite::Result<SaveAsset> {
    Ok(SaveAsset {
        id: row.get(0)?,
        name: row.get(1)?,
        display_name: row.get(2)?,
        category: "accessory".to_string(),
        file_path: row.get(3)?,
        booth_url: row.get(4)?,
        thumbnail_url: row.get(5)?,
        note: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn asset_with_category_from_row(row: &Row<'_>) -> rusqlite::Result<SaveAsset> {
    Ok(SaveAsset {
        id: row.get(0)?,
        name: row.get(1)?,
        display_name: row.get(2)?,
        category: row.get(3)?,
        file_path: row.get(4)?,
        booth_url: row.get(5)?,
        thumbnail_url: row.get(6)?,
        note: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

fn library_settings_from_row(row: &Row<'_>) -> rusqlite::Result<SaveLibrarySettings> {
    Ok(SaveLibrarySettings {
        root_path: row.get(0)?,
        avatar_folder: row.get(1)?,
        accessory_folder: row.get(2)?,
        world_folder: row.get(3)?,
        updated_at: row.get(4)?,
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

fn asset_link_from_row(row: &Row<'_>) -> rusqlite::Result<SaveAssetLink> {
    Ok(SaveAssetLink {
        id: row.get(0)?,
        asset_id: row.get(1)?,
        label: row.get(2)?,
        url: row.get(3)?,
        sort_order: row.get(4)?,
    })
}

fn vcc_project_from_row(row: &Row<'_>) -> rusqlite::Result<SaveVccProject> {
    Ok(SaveVccProject {
        id: row.get(0)?,
        name: row.get(1)?,
        path: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

fn vcc_repository_from_row(row: &Row<'_>) -> rusqlite::Result<SaveVccRepository> {
    Ok(SaveVccRepository {
        id: row.get(0)?,
        name: row.get(1)?,
        url: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
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

fn archive_rows<T>(
    conn: &Connection,
    sql: &str,
    mapper: fn(&Row<'_>) -> rusqlite::Result<T>,
) -> CommandResult<Vec<T>> {
    query_all(conn, sql, mapper).map_err(db_error)
}

fn export_timestamp(conn: &Connection) -> CommandResult<String> {
    conn.query_row("SELECT datetime('now')", [], |row| row.get::<_, String>(0))
        .map_err(db_error)
}

fn default_asset_category() -> String {
    "accessory".to_string()
}

fn export_assets(conn: &Connection) -> CommandResult<Vec<SaveAsset>> {
    match archive_rows(conn, EXPORT_ASSETS_WITH_CATEGORY_SQL, asset_with_category_from_row) {
        Ok(assets) => Ok(assets),
        Err(_) => archive_rows(conn, EXPORT_ASSETS_SQL, asset_from_row),
    }
}

fn export_library_settings(conn: &Connection) -> CommandResult<Option<SaveLibrarySettings>> {
    match conn.query_row(
        "SELECT root_path, avatar_folder, accessory_folder, world_folder, updated_at
         FROM library_settings
         WHERE id = 1",
        [],
        library_settings_from_row,
    ) {
        Ok(settings) => Ok(Some(settings)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(error) => Err(db_error(error)),
    }
}

fn summary(
    path: String,
    archive: &SaveArchive,
    vcc_backup: Option<&VccBackupResult>,
) -> SaveSummary {
    SaveSummary {
        path,
        models: archive.models.len(),
        tags: archive.tags.len(),
        assets: archive.assets.len(),
        asset_models: archive.asset_models.len(),
        asset_tags: archive.asset_tags.len(),
        asset_links: archive.asset_links.len(),
        vcc_projects: archive.vcc_projects.len(),
        vcc_repositories: archive.vcc_repositories.len(),
        vcc_backup_path: vcc_backup.map(|backup| backup.path.clone()),
        vcc_backup_files: vcc_backup.map(|backup| backup.files).unwrap_or_default(),
        vcc_cached_repositories: vcc_backup
            .map(|backup| backup.cached_repositories)
            .unwrap_or_default(),
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
    Ok(SaveArchive {
        schema_version: SAVE_SCHEMA_VERSION,
        app: "vrc-asset-manager".to_string(),
        exported_at: export_timestamp(conn)?,
        models: archive_rows(conn, EXPORT_MODELS_SQL, model_from_row)?,
        tags: archive_rows(conn, EXPORT_TAGS_SQL, tag_from_row)?,
        assets: export_assets(conn)?,
        asset_models: archive_rows(conn, EXPORT_ASSET_MODELS_SQL, asset_model_from_row)?,
        asset_tags: archive_rows(conn, EXPORT_ASSET_TAGS_SQL, asset_tag_from_row)?,
        asset_links: archive_rows(conn, EXPORT_ASSET_LINKS_SQL, asset_link_from_row)?,
        vcc_projects: archive_rows(conn, EXPORT_VCC_PROJECTS_SQL, vcc_project_from_row)?,
        vcc_repositories: archive_rows(conn, EXPORT_VCC_REPOSITORIES_SQL, vcc_repository_from_row)?,
        vcc_project_snapshots: snapshot_vcc_projects(conn)?,
        library_settings: export_library_settings(conn)?,
    })
}

fn vcc_backup_dir_for(save_path: &Path) -> PathBuf {
    let parent = save_path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."));
    let stem = save_path
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("vrc-asset-manager-save");

    parent.join(format!("{stem}_vcc_backup"))
}

fn relative_display(base: &Path, path: &Path) -> String {
    path.strip_prefix(base)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

struct VccBackupCopier<'a> {
    backup_dir: &'a Path,
    copied_files: &'a mut Vec<String>,
}

impl VccBackupCopier<'_> {
    fn copy_file(&mut self, source: &Path, destination: &Path) -> CommandResult<bool> {
        if !source.is_file() {
            return Ok(false);
        }

        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent).map_err(db_error)?;
        }
        fs::copy(source, destination).map_err(db_error)?;
        self.copied_files
            .push(relative_display(self.backup_dir, destination));

        Ok(true)
    }

    fn copy_cached_repositories(
        &mut self,
        repos_dir: &Path,
        backup_repos_dir: &Path,
    ) -> CommandResult<usize> {
        if !repos_dir.is_dir() {
            return Ok(0);
        }

        fs::create_dir_all(backup_repos_dir).map_err(db_error)?;
        let mut copied = 0;
        for entry in fs::read_dir(repos_dir).map_err(db_error)? {
            let entry = entry.map_err(db_error)?;
            let source = entry.path();
            if source.extension().and_then(|extension| extension.to_str()) != Some("json") {
                continue;
            }

            let Some(file_name) = source.file_name() else {
                continue;
            };
            let destination = backup_repos_dir.join(file_name);
            if self.copy_file(&source, &destination)? {
                copied += 1;
            }
        }

        Ok(copied)
    }
}

fn copy_vcc_local_backup(backup_dir: &Path) -> CommandResult<VccLocalBackup> {
    let Some(app_data_dir) = vcc_app_data_dir() else {
        return Ok(VccLocalBackup::default());
    };

    let mut copied_files = Vec::new();
    let local_backup_dir = backup_dir.join("vcc-local");
    let repos_dir = app_data_dir.join("Repos");
    let backup_repos_dir = local_backup_dir.join("Repos");
    let (settings_copied, cached_repositories) = {
        let mut copier = VccBackupCopier {
            backup_dir,
            copied_files: &mut copied_files,
        };
        let settings_copied = copier.copy_file(
            &app_data_dir.join("settings.json"),
            &local_backup_dir.join("settings.json"),
        )?;
        let cached_repositories = copier.copy_cached_repositories(&repos_dir, &backup_repos_dir)?;
        (settings_copied, cached_repositories)
    };

    Ok(VccLocalBackup {
        app_data_path: Some(app_data_dir.to_string_lossy().to_string()),
        copied_files,
        settings_copied,
        cached_repositories,
    })
}

fn write_vcc_backup_readme(backup_dir: &Path) -> CommandResult<()> {
    let readme = [
        "VRC Asset Manager - VCC backup bundle",
        "",
        "This folder is created next to the main save file.",
        "Import the main save JSON in VRC Asset Manager to restore tracked VCC projects and package repositories.",
        "The vcc-local folder is a reference copy of VRChat Creator Companion settings/cache from this machine.",
        "Do not overwrite a new machine's VCC files blindly; use vcc-backup.json as the source of truth for repo URLs and snapshots.",
        "",
    ]
    .join("\n");
    fs::write(backup_dir.join("README.txt"), readme).map_err(db_error)
}

fn export_vcc_backup_bundle(
    save_path: &Path,
    archive: &SaveArchive,
) -> CommandResult<VccBackupResult> {
    let backup_dir = vcc_backup_dir_for(save_path);
    fs::create_dir_all(&backup_dir).map_err(db_error)?;

    let local_vcc = copy_vcc_local_backup(&backup_dir)?;
    let manifest = VccBackupManifest {
        schema_version: VCC_BACKUP_SCHEMA_VERSION,
        app: "vrc-asset-manager-vcc-backup",
        exported_at: &archive.exported_at,
        restore_note:
            "Import the main save JSON first. This sidecar keeps VCC repository/project data and a reference copy of local VCC settings/cache.",
        vcc_projects: &archive.vcc_projects,
        vcc_repositories: &archive.vcc_repositories,
        vcc_project_snapshots: &archive.vcc_project_snapshots,
        local_vcc,
    };
    let manifest_json = serde_json::to_string_pretty(&manifest).map_err(db_error)?;
    fs::write(backup_dir.join("vcc-backup.json"), manifest_json).map_err(db_error)?;
    write_vcc_backup_readme(&backup_dir)?;

    Ok(VccBackupResult {
        path: backup_dir.to_string_lossy().to_string(),
        files: manifest.local_vcc.copied_files.len() + 2,
        cached_repositories: manifest.local_vcc.cached_repositories,
    })
}

fn clear_database(tx: &Transaction<'_>) -> CommandResult<()> {
    tx.execute("DELETE FROM vcc_repositories", [])
        .map_err(db_error)?;
    tx.execute("DELETE FROM vcc_projects", [])
        .map_err(db_error)?;
    tx.execute("DELETE FROM asset_links", [])
        .map_err(db_error)?;
    tx.execute("DELETE FROM asset_models", [])
        .map_err(db_error)?;
    tx.execute("DELETE FROM asset_tags", []).map_err(db_error)?;
    tx.execute("DELETE FROM assets", []).map_err(db_error)?;
    tx.execute("DELETE FROM models", []).map_err(db_error)?;
    tx.execute("DELETE FROM tags", []).map_err(db_error)?;
    tx.execute(
        "DELETE FROM sqlite_sequence WHERE name IN ('assets', 'models', 'tags', 'asset_links', 'vcc_projects', 'vcc_repositories')",
        [],
    )
    .map_err(db_error)?;

    Ok(())
}

fn restored_sort_order(index: usize, sort_order: i64) -> i64 {
    if sort_order > 0 {
        sort_order
    } else {
        index as i64 + 1
    }
}

fn insert_models(tx: &Transaction<'_>, models: &[SaveModel]) -> CommandResult<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO models (id, name, display_name, sort_order, created_at)
             VALUES (?, ?, ?, ?, ?)",
        )
        .map_err(db_error)?;

    for (index, model) in models.iter().enumerate() {
        stmt.execute(params![
            model.id,
            &model.name,
            model.display_name.as_deref(),
            restored_sort_order(index, model.sort_order),
            &model.created_at
        ])
        .map_err(db_error)?;
    }

    Ok(())
}

fn insert_tags(tx: &Transaction<'_>, tags: &[SaveTag]) -> CommandResult<()> {
    let mut stmt = tx
        .prepare("INSERT INTO tags (id, name, color, sort_order) VALUES (?, ?, ?, ?)")
        .map_err(db_error)?;

    for (index, tag) in tags.iter().enumerate() {
        stmt.execute(params![
            tag.id,
            &tag.name,
            &tag.color,
            restored_sort_order(index, tag.sort_order)
        ])
        .map_err(db_error)?;
    }

    Ok(())
}

fn insert_assets(tx: &Transaction<'_>, assets: &[SaveAsset]) -> CommandResult<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO assets
                (id, name, display_name, category, file_path, booth_url, thumbnail_url, note, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .map_err(db_error)?;

    for asset in assets {
        let category = match asset.category.as_str() {
            "avatar" | "accessory" | "world" => asset.category.as_str(),
            _ => "accessory",
        };
        stmt.execute(params![
            asset.id,
            &asset.name,
            asset.display_name.as_deref(),
            category,
            &asset.file_path,
            asset.booth_url.as_deref(),
            asset.thumbnail_url.as_deref(),
            asset.note.as_deref(),
            &asset.created_at,
            &asset.updated_at
        ])
        .map_err(db_error)?;
    }

    Ok(())
}

fn insert_asset_links(tx: &Transaction<'_>, links: &[SaveAssetLink]) -> CommandResult<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO asset_links (id, asset_id, label, url, sort_order)
             VALUES (?, ?, ?, ?, ?)",
        )
        .map_err(db_error)?;

    for (index, link) in links.iter().enumerate() {
        stmt.execute(params![
            link.id,
            link.asset_id,
            &link.label,
            &link.url,
            restored_sort_order(index, link.sort_order)
        ])
        .map_err(db_error)?;
    }

    Ok(())
}

fn insert_vcc_repositories(
    tx: &Transaction<'_>,
    repositories: &[SaveVccRepository],
) -> CommandResult<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO vcc_repositories (id, name, url, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)",
        )
        .map_err(db_error)?;

    for repository in repositories {
        stmt.execute(params![
            repository.id,
            &repository.name,
            &repository.url,
            &repository.created_at,
            &repository.updated_at
        ])
        .map_err(db_error)?;
    }

    Ok(())
}

fn insert_vcc_projects(tx: &Transaction<'_>, projects: &[SaveVccProject]) -> CommandResult<()> {
    let mut stmt = tx
        .prepare(
            "INSERT INTO vcc_projects (id, name, path, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)",
        )
        .map_err(db_error)?;

    for project in projects {
        stmt.execute(params![
            project.id,
            &project.name,
            &project.path,
            &project.created_at,
            &project.updated_at
        ])
        .map_err(db_error)?;
    }

    Ok(())
}

fn insert_asset_models(tx: &Transaction<'_>, relations: &[SaveAssetModel]) -> CommandResult<()> {
    let mut stmt = tx
        .prepare("INSERT INTO asset_models (asset_id, model_id) VALUES (?, ?)")
        .map_err(db_error)?;

    for relation in relations {
        stmt.execute(params![relation.asset_id, relation.model_id])
            .map_err(db_error)?;
    }

    Ok(())
}

fn insert_asset_tags(tx: &Transaction<'_>, relations: &[SaveAssetTag]) -> CommandResult<()> {
    let mut stmt = tx
        .prepare("INSERT INTO asset_tags (asset_id, tag_id) VALUES (?, ?)")
        .map_err(db_error)?;

    for relation in relations {
        stmt.execute(params![relation.asset_id, relation.tag_id])
            .map_err(db_error)?;
    }

    Ok(())
}

fn replace_database(tx: &Transaction<'_>, archive: &SaveArchive) -> CommandResult<()> {
    clear_database(tx)?;
    insert_models(tx, &archive.models)?;
    insert_tags(tx, &archive.tags)?;
    insert_assets(tx, &archive.assets)?;
    insert_asset_links(tx, &archive.asset_links)?;
    insert_vcc_repositories(tx, &archive.vcc_repositories)?;
    ensure_vcc_repositories(tx).map_err(db_error)?;
    insert_vcc_projects(tx, &archive.vcc_projects)?;
    insert_asset_models(tx, &archive.asset_models)?;
    insert_asset_tags(tx, &archive.asset_tags)
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
    let vcc_backup = export_vcc_backup_bundle(save_path, &archive)?;

    Ok(summary(
        save_path.to_string_lossy().to_string(),
        &archive,
        Some(&vcc_backup),
    ))
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

    Ok(summary(
        save_path.to_string_lossy().to_string(),
        &archive,
        None,
    ))
}
