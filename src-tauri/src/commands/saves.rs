use crate::{db::DbState, types::VccProjectSnapshot};
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
    let exported_at = conn
        .query_row("SELECT datetime('now')", [], |row| row.get::<_, String>(0))
        .map_err(db_error)?;

    Ok(SaveArchive {
        schema_version: SAVE_SCHEMA_VERSION,
        app: "vrc-asset-manager".to_string(),
        exported_at,
        models: query_all(
            conn,
            "SELECT id, name, display_name, sort_order, created_at FROM models ORDER BY sort_order, id",
            model_from_row,
        )
        .map_err(db_error)?,
        tags: query_all(
            conn,
            "SELECT id, name, color, sort_order FROM tags ORDER BY sort_order, id",
            tag_from_row,
        )
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
        asset_links: query_all(
            conn,
            "SELECT id, asset_id, label, url, sort_order
             FROM asset_links
             ORDER BY asset_id, sort_order, id",
            asset_link_from_row,
        )
        .map_err(db_error)?,
        vcc_projects: query_all(
            conn,
            "SELECT id, name, path, created_at, updated_at
             FROM vcc_projects
             ORDER BY name COLLATE NOCASE, path COLLATE NOCASE",
            vcc_project_from_row,
        )
        .map_err(db_error)?,
        vcc_repositories: query_all(
            conn,
            "SELECT id, name, url, created_at, updated_at
             FROM vcc_repositories
             ORDER BY name COLLATE NOCASE, url COLLATE NOCASE",
            vcc_repository_from_row,
        )
        .map_err(db_error)?,
        vcc_project_snapshots: snapshot_vcc_projects(conn)?,
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

fn copy_backup_file(
    source: &Path,
    destination: &Path,
    backup_dir: &Path,
    copied_files: &mut Vec<String>,
) -> CommandResult<bool> {
    if !source.is_file() {
        return Ok(false);
    }

    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(db_error)?;
    }
    fs::copy(source, destination).map_err(db_error)?;
    copied_files.push(relative_display(backup_dir, destination));

    Ok(true)
}

fn copy_vcc_local_backup(backup_dir: &Path) -> CommandResult<VccLocalBackup> {
    let Some(app_data_dir) = vcc_app_data_dir() else {
        return Ok(VccLocalBackup::default());
    };

    let mut copied_files = Vec::new();
    let local_backup_dir = backup_dir.join("vcc-local");
    let settings_copied = copy_backup_file(
        &app_data_dir.join("settings.json"),
        &local_backup_dir.join("settings.json"),
        backup_dir,
        &mut copied_files,
    )?;

    let repos_dir = app_data_dir.join("Repos");
    let backup_repos_dir = local_backup_dir.join("Repos");
    let mut cached_repositories = 0;
    if repos_dir.is_dir() {
        fs::create_dir_all(&backup_repos_dir).map_err(db_error)?;
        for entry in fs::read_dir(&repos_dir).map_err(db_error)? {
            let entry = entry.map_err(db_error)?;
            let source = entry.path();
            if source.extension().and_then(|extension| extension.to_str()) != Some("json") {
                continue;
            }

            let Some(file_name) = source.file_name() else {
                continue;
            };
            let destination = backup_repos_dir.join(file_name);
            if copy_backup_file(&source, &destination, backup_dir, &mut copied_files)? {
                cached_repositories += 1;
            }
        }
    }

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

fn replace_database(tx: &Transaction<'_>, archive: &SaveArchive) -> CommandResult<()> {
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

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO models (id, name, display_name, sort_order, created_at)
                 VALUES (?, ?, ?, ?, ?)",
            )
            .map_err(db_error)?;
        for (index, model) in archive.models.iter().enumerate() {
            let sort_order = if model.sort_order > 0 {
                model.sort_order
            } else {
                index as i64 + 1
            };
            stmt.execute(params![
                model.id,
                &model.name,
                model.display_name.as_deref(),
                sort_order,
                &model.created_at
            ])
            .map_err(db_error)?;
        }
    }

    {
        let mut stmt = tx
            .prepare("INSERT INTO tags (id, name, color, sort_order) VALUES (?, ?, ?, ?)")
            .map_err(db_error)?;
        for (index, tag) in archive.tags.iter().enumerate() {
            let sort_order = if tag.sort_order > 0 {
                tag.sort_order
            } else {
                index as i64 + 1
            };
            stmt.execute(params![tag.id, &tag.name, &tag.color, sort_order])
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
            .prepare(
                "INSERT INTO asset_links (id, asset_id, label, url, sort_order)
                 VALUES (?, ?, ?, ?, ?)",
            )
            .map_err(db_error)?;
        for (index, link) in archive.asset_links.iter().enumerate() {
            let sort_order = if link.sort_order > 0 {
                link.sort_order
            } else {
                index as i64 + 1
            };
            stmt.execute(params![
                link.id,
                link.asset_id,
                &link.label,
                &link.url,
                sort_order
            ])
            .map_err(db_error)?;
        }
    }

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO vcc_repositories (id, name, url, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?)",
            )
            .map_err(db_error)?;
        for repository in &archive.vcc_repositories {
            stmt.execute(params![
                repository.id,
                &repository.name,
                &repository.url,
                &repository.created_at,
                &repository.updated_at
            ])
            .map_err(db_error)?;
        }
    }
    tx.execute(
        "UPDATE vcc_repositories
         SET name = 'VRChat Official',
             url = 'https://packages.vrchat.com/official',
             updated_at = datetime('now')
         WHERE url = 'https://vrchat.github.io/packages/index.json'
           AND NOT EXISTS (
               SELECT 1 FROM vcc_repositories
               WHERE url = 'https://packages.vrchat.com/official'
           )",
        [],
    )
    .map_err(db_error)?;
    for (name, url) in [
        ("VRChat Official", "https://packages.vrchat.com/official"),
        ("VRChat Curated", "https://packages.vrchat.com/curated"),
    ] {
        tx.execute(
            "INSERT OR IGNORE INTO vcc_repositories (name, url) VALUES (?, ?)",
            params![name, url],
        )
        .map_err(db_error)?;
    }

    {
        let mut stmt = tx
            .prepare(
                "INSERT INTO vcc_projects (id, name, path, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?)",
            )
            .map_err(db_error)?;
        for project in &archive.vcc_projects {
            stmt.execute(params![
                project.id,
                &project.name,
                &project.path,
                &project.created_at,
                &project.updated_at
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
