use crate::{
    db::DbState,
    types::{
        AddVccProjectInput, AddVccRepositoryInput, VccPackage, VccProject, VccProjectSnapshot,
        VccRepository,
    },
};
use rusqlite::{params, Connection, Row};
use serde_json::Value;
use std::{
    cmp::Ordering,
    collections::{BTreeMap, BTreeSet},
    env, fs,
    path::{Path, PathBuf},
    time::Duration,
};
use tauri::State;

use super::{connection, db_error, normalize_optional, CommandResult};

#[derive(Debug, Clone)]
struct RepositorySource {
    name: String,
    url: String,
}

fn project_from_row(row: &Row<'_>) -> rusqlite::Result<VccProject> {
    Ok(VccProject {
        id: row.get(0)?,
        name: row.get(1)?,
        path: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

fn repository_from_row(row: &Row<'_>) -> rusqlite::Result<VccRepository> {
    Ok(VccRepository {
        id: row.get(0)?,
        name: row.get(1)?,
        url: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

fn get_project_by_id(conn: &Connection, id: i64) -> rusqlite::Result<VccProject> {
    conn.query_row(
        "SELECT id, name, path, created_at, updated_at
         FROM vcc_projects
         WHERE id = ?",
        params![id],
        project_from_row,
    )
}

fn path_display(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

fn project_name_from_path(path: &Path) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or("VCC Project")
        .to_string()
}

fn normalize_project_path(path: &str) -> CommandResult<PathBuf> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Project path is required".to_string());
    }

    let path = PathBuf::from(trimmed);
    if !path.is_dir() {
        return Err("Project folder does not exist".to_string());
    }

    let packages_path = path.join("Packages");
    if !packages_path.is_dir() {
        return Err("Selected folder does not look like a Unity project".to_string());
    }

    Ok(path)
}

fn read_json_if_exists(path: &Path) -> Result<Option<Value>, String> {
    if !path.exists() {
        return Ok(None);
    }

    let json = fs::read_to_string(path).map_err(db_error)?;
    serde_json::from_str(&json).map(Some).map_err(db_error)
}

fn string_field(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        value
            .get(*key)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|text| !text.is_empty())
            .map(ToString::to_string)
    })
}

fn dependency_version(value: &Value) -> Option<String> {
    value
        .as_str()
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(ToString::to_string)
        .or_else(|| string_field(value, &["version", "requiredVersion", "resolvedVersion"]))
}

fn dependency_source(value: &Value) -> Option<String> {
    value
        .as_object()
        .and_then(|_| string_field(value, &["source", "url", "repository", "repo"]))
}

fn repository_name_from_url(url: &str) -> String {
    url.trim()
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("VPM Repository")
        .to_string()
}

fn normalize_repository_url(url: &str) -> Option<String> {
    let url = url.trim();
    if url.is_empty() {
        return None;
    }

    Some(url.to_string())
}

fn repository_root(manifest: &Value) -> &Value {
    manifest.get("repo").unwrap_or(manifest)
}

fn repository_source_from_value(value: &Value) -> Option<RepositorySource> {
    let repo = repository_root(value);
    let url = string_field(repo, &["url"]).or_else(|| string_field(value, &["url"]))?;
    let url = normalize_repository_url(&url)?;
    let name = string_field(repo, &["name", "displayName", "id"])
        .or_else(|| string_field(value, &["name", "displayName", "id"]))
        .unwrap_or_else(|| repository_name_from_url(&url));

    Some(RepositorySource { name, url })
}

pub(crate) fn vcc_app_data_dir() -> Option<PathBuf> {
    env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|path| path.join("VRChatCreatorCompanion"))
}

fn push_repository_source(
    repositories: &mut BTreeMap<String, RepositorySource>,
    source: RepositorySource,
) {
    if let Some(url) = normalize_repository_url(&source.url) {
        repositories.entry(url.clone()).or_insert(RepositorySource {
            name: source.name,
            url,
        });
    }
}

fn discover_vcc_repository_sources() -> Vec<RepositorySource> {
    let mut repositories = BTreeMap::new();
    let Some(app_data_dir) = vcc_app_data_dir() else {
        return Vec::new();
    };

    let settings_path = app_data_dir.join("settings.json");
    if let Ok(Some(settings)) = read_json_if_exists(&settings_path) {
        if let Some(user_repos) = settings.get("userRepos").and_then(Value::as_array) {
            for repo in user_repos {
                if let Some(source) = repository_source_from_value(repo) {
                    push_repository_source(&mut repositories, source);
                }
            }
        }
    }

    let repos_dir = app_data_dir.join("Repos");
    if let Ok(entries) = fs::read_dir(repos_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|extension| extension.to_str()) != Some("json") {
                continue;
            }

            if let Ok(Some(manifest)) = read_json_if_exists(&path) {
                if let Some(source) = repository_source_from_value(&manifest) {
                    push_repository_source(&mut repositories, source);
                }
            }
        }
    }

    repositories.into_values().collect()
}

fn compare_version_segment(a: &str, b: &str) -> Ordering {
    match (a.parse::<u64>(), b.parse::<u64>()) {
        (Ok(left), Ok(right)) => left.cmp(&right),
        _ => a.cmp(b),
    }
}

fn compare_versions(a: &str, b: &str) -> Ordering {
    let a_core = a.split(['-', '+']).next().unwrap_or(a);
    let b_core = b.split(['-', '+']).next().unwrap_or(b);
    let mut a_parts = a_core.split('.');
    let mut b_parts = b_core.split('.');

    loop {
        match (a_parts.next(), b_parts.next()) {
            (Some(left), Some(right)) => {
                let ordering = compare_version_segment(left, right);
                if ordering != Ordering::Equal {
                    return ordering;
                }
            }
            (Some(left), None) => {
                let ordering = compare_version_segment(left, "0");
                if ordering != Ordering::Equal {
                    return ordering;
                }
            }
            (None, Some(right)) => {
                let ordering = compare_version_segment("0", right);
                if ordering != Ordering::Equal {
                    return ordering;
                }
            }
            (None, None) => break,
        }
    }

    match (a.contains('-'), b.contains('-')) {
        (false, true) => Ordering::Greater,
        (true, false) => Ordering::Less,
        _ => a.cmp(b),
    }
}

fn latest_version(versions: &serde_json::Map<String, Value>) -> Option<String> {
    versions
        .keys()
        .max_by(|left, right| compare_versions(left, right))
        .cloned()
}

fn packages_from_repository_manifest(
    source_name: &str,
    manifest: &Value,
) -> Result<Vec<VccPackage>, String> {
    let repository = repository_root(manifest);
    let packages = repository
        .get("packages")
        .and_then(Value::as_object)
        .ok_or_else(|| format!("Repository {} has no packages field", source_name))?;

    Ok(packages
        .iter()
        .filter_map(|(package_id, package)| {
            let versions = package.get("versions").and_then(Value::as_object)?;
            let latest = latest_version(versions)?;
            let latest_manifest = versions.get(&latest).unwrap_or(package);

            Some(VccPackage {
                package_id: package_id.clone(),
                display_name: string_field(latest_manifest, &["displayName", "name"])
                    .or_else(|| string_field(package, &["displayName", "name"])),
                requested_version: None,
                installed_version: None,
                latest_version: Some(latest),
                source: Some(source_name.to_string()),
                installed: false,
                available: true,
            })
        })
        .collect())
}

fn read_repository_source_packages(source: &RepositorySource) -> Result<Vec<VccPackage>, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent("VRC Asset Manager/0.1")
        .build()
        .map_err(db_error)?;
    let response = client
        .get(source.url.trim())
        .send()
        .and_then(|response| response.error_for_status())
        .map_err(db_error)?;

    let json = response.text().map_err(db_error)?;
    let manifest: Value = serde_json::from_str(&json).map_err(db_error)?;
    packages_from_repository_manifest(&source.name, &manifest)
}

fn repository_to_source(repository: &VccRepository) -> RepositorySource {
    RepositorySource {
        name: repository.name.clone(),
        url: repository.url.clone(),
    }
}

fn merge_catalog_package(packages: &mut BTreeMap<String, VccPackage>, package: VccPackage) {
    packages
        .entry(package.package_id.clone())
        .and_modify(|current| {
            match (&current.latest_version, &package.latest_version) {
                (Some(current_version), Some(next_version))
                    if compare_versions(next_version, current_version) == Ordering::Greater =>
                {
                    current.latest_version = package.latest_version.clone();
                }
                (None, Some(_)) => {
                    current.latest_version = package.latest_version.clone();
                }
                _ => {}
            }
            if current.display_name.is_none() {
                current.display_name = package.display_name.clone();
            }
            if current.source.is_none() {
                current.source = package.source.clone();
            }
            current.available = current.available || package.available;
        })
        .or_insert(package);
}

fn read_cached_repository_catalog(
    allowed_urls: &BTreeSet<String>,
) -> (Vec<VccPackage>, BTreeSet<String>) {
    let mut packages = BTreeMap::new();
    let mut cached_urls = BTreeSet::new();
    let Some(repos_dir) = vcc_app_data_dir().map(|path| path.join("Repos")) else {
        return (Vec::new(), cached_urls);
    };

    let Ok(entries) = fs::read_dir(repos_dir) else {
        return (Vec::new(), cached_urls);
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|extension| extension.to_str()) != Some("json") {
            continue;
        }

        let Ok(Some(manifest)) = read_json_if_exists(&path) else {
            continue;
        };
        let Some(source) = repository_source_from_value(&manifest) else {
            continue;
        };
        if !allowed_urls.contains(&source.url) {
            continue;
        }
        let source_name = source.name;

        if let Ok(repository_packages) = packages_from_repository_manifest(&source_name, &manifest)
        {
            cached_urls.insert(source.url);
            for package in repository_packages {
                merge_catalog_package(&mut packages, package);
            }
        }
    }

    (packages.into_values().collect(), cached_urls)
}

fn read_repository_catalog(repositories: &[VccRepository]) -> Vec<VccPackage> {
    let mut packages = BTreeMap::new();
    let mut sources = BTreeMap::new();

    for repository in repositories {
        push_repository_source(&mut sources, repository_to_source(repository));
    }
    let allowed_urls = sources.keys().cloned().collect::<BTreeSet<_>>();
    let (cached_packages, cached_urls) = read_cached_repository_catalog(&allowed_urls);
    for package in cached_packages {
        merge_catalog_package(&mut packages, package);
    }

    for source in sources.into_values() {
        if cached_urls.contains(&source.url) {
            continue;
        }
        if let Ok(repository_packages) = read_repository_source_packages(&source) {
            for package in repository_packages {
                merge_catalog_package(&mut packages, package);
            }
        }
    }

    packages.into_values().collect()
}

fn read_package_json(project_path: &Path, package_id: &str) -> Option<Value> {
    let package_json_path = project_path
        .join("Packages")
        .join(package_id)
        .join("package.json");
    read_json_if_exists(&package_json_path).ok().flatten()
}

fn dependency_packages(
    project_path: &Path,
    vpm_manifest: Option<&Value>,
    unity_manifest: Option<&Value>,
    catalog_packages: &[VccPackage],
) -> Vec<VccPackage> {
    let mut package_ids = BTreeSet::new();
    let mut packages: BTreeMap<String, VccPackage> = BTreeMap::new();

    for package in catalog_packages {
        package_ids.insert(package.package_id.clone());
        packages.insert(package.package_id.clone(), package.clone());
    }

    if let Some(dependencies) = vpm_manifest
        .and_then(|manifest| manifest.get("dependencies"))
        .and_then(Value::as_object)
    {
        for (package_id, dependency) in dependencies {
            package_ids.insert(package_id.clone());
            packages
                .entry(package_id.clone())
                .and_modify(|package| {
                    package.display_name = string_field(dependency, &["displayName", "name"])
                        .or_else(|| package.display_name.clone());
                    package.requested_version = dependency_version(dependency);
                    package.source =
                        dependency_source(dependency).or_else(|| package.source.clone());
                })
                .or_insert(VccPackage {
                    package_id: package_id.clone(),
                    display_name: string_field(dependency, &["displayName", "name"]),
                    requested_version: dependency_version(dependency),
                    installed_version: None,
                    latest_version: None,
                    source: dependency_source(dependency),
                    installed: false,
                    available: false,
                });
        }
    }

    if let Some(dependencies) = unity_manifest
        .and_then(|manifest| manifest.get("dependencies"))
        .and_then(Value::as_object)
    {
        for package_id in dependencies.keys() {
            if package_ids.contains(package_id)
                || project_path.join("Packages").join(package_id).is_dir()
            {
                package_ids.insert(package_id.clone());
                packages.entry(package_id.clone()).or_insert(VccPackage {
                    package_id: package_id.clone(),
                    display_name: None,
                    requested_version: dependencies
                        .get(package_id)
                        .and_then(Value::as_str)
                        .map(ToString::to_string),
                    installed_version: None,
                    latest_version: None,
                    source: None,
                    installed: false,
                    available: false,
                });
            }
        }
    }

    for package_id in package_ids {
        if let Some(package) = packages.get_mut(&package_id) {
            if let Some(package_json) = read_package_json(project_path, &package_id) {
                package.display_name = package
                    .display_name
                    .clone()
                    .or_else(|| string_field(&package_json, &["displayName", "name"]));
                package.installed_version = string_field(&package_json, &["version"]);
                package.installed = true;
                package.available = true;
            } else {
                package.installed = project_path.join("Packages").join(&package_id).is_dir();
            }
        }
    }

    packages.into_values().collect()
}

fn scan_project(project: VccProject, catalog_packages: &[VccPackage]) -> VccProjectSnapshot {
    let project_path = Path::new(&project.path);
    let scanned_at = chrono_like_now();
    let vpm_manifest_path = project_path.join("Packages").join("vpm-manifest.json");
    let unity_manifest_path = project_path.join("Packages").join("manifest.json");

    let scan = (|| {
        if !project_path.is_dir() {
            return Err("Project folder does not exist".to_string());
        }

        let vpm_manifest = read_json_if_exists(&vpm_manifest_path)?;
        let unity_manifest = read_json_if_exists(&unity_manifest_path)?;
        let packages = dependency_packages(
            project_path,
            vpm_manifest.as_ref(),
            unity_manifest.as_ref(),
            catalog_packages,
        );

        Ok((packages, vpm_manifest, unity_manifest))
    })();

    match scan {
        Ok((packages, vpm_manifest, unity_manifest)) => VccProjectSnapshot {
            project,
            packages,
            vpm_manifest,
            unity_manifest,
            scanned_at,
            scan_error: None,
        },
        Err(error) => VccProjectSnapshot {
            project,
            packages: Vec::new(),
            vpm_manifest: None,
            unity_manifest: None,
            scanned_at,
            scan_error: Some(error),
        },
    }
}

fn chrono_like_now() -> String {
    // Keep timestamps aligned with SQLite's UTC datetime format without adding a time crate.
    Connection::open_in_memory()
        .and_then(|conn| conn.query_row("SELECT datetime('now')", [], |row| row.get(0)))
        .unwrap_or_else(|_| "".to_string())
}

pub(crate) fn list_vcc_projects(conn: &Connection) -> rusqlite::Result<Vec<VccProject>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, path, created_at, updated_at
         FROM vcc_projects
         ORDER BY name COLLATE NOCASE, path COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([], project_from_row)?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
}

pub(crate) fn list_vcc_repositories(conn: &Connection) -> rusqlite::Result<Vec<VccRepository>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, url, created_at, updated_at
         FROM vcc_repositories
         ORDER BY name COLLATE NOCASE, url COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([], repository_from_row)?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
}

fn upsert_vcc_repository(conn: &Connection, name: &str, url: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO vcc_repositories (name, url) VALUES (?, ?)",
        params![name, url],
    )?;
    conn.execute(
        "UPDATE vcc_repositories SET name = ?, updated_at = datetime('now') WHERE url = ?",
        params![name, url],
    )?;

    Ok(())
}

pub(crate) fn snapshot_vcc_projects(conn: &Connection) -> CommandResult<Vec<VccProjectSnapshot>> {
    let projects = list_vcc_projects(conn).map_err(db_error)?;
    let repositories = list_vcc_repositories(conn).map_err(db_error)?;
    let catalog_packages = read_repository_catalog(&repositories);
    Ok(projects
        .into_iter()
        .map(|project| scan_project(project, &catalog_packages))
        .collect())
}

#[tauri::command]
pub fn get_vcc_projects(db: State<'_, DbState>) -> CommandResult<Vec<VccProject>> {
    let conn = connection(&db)?;
    list_vcc_projects(&conn).map_err(db_error)
}

#[tauri::command]
pub fn get_vcc_repositories(db: State<'_, DbState>) -> CommandResult<Vec<VccRepository>> {
    let conn = connection(&db)?;
    list_vcc_repositories(&conn).map_err(db_error)
}

#[tauri::command]
pub fn add_vcc_project(
    input: AddVccProjectInput,
    db: State<'_, DbState>,
) -> CommandResult<VccProject> {
    let path = normalize_project_path(&input.path)?;
    let name = normalize_optional(input.name).unwrap_or_else(|| project_name_from_path(&path));
    let path = path_display(&path);
    let conn = connection(&db)?;

    conn.execute(
        "INSERT OR IGNORE INTO vcc_projects (name, path) VALUES (?, ?)",
        params![name, path],
    )
    .map_err(db_error)?;
    conn.execute(
        "UPDATE vcc_projects SET name = ?, updated_at = datetime('now') WHERE path = ?",
        params![name, path],
    )
    .map_err(db_error)?;

    conn.query_row(
        "SELECT id, name, path, created_at, updated_at
         FROM vcc_projects
         WHERE path = ?",
        params![path],
        project_from_row,
    )
    .map_err(db_error)
}

#[tauri::command]
pub fn delete_vcc_project(id: i64, db: State<'_, DbState>) -> CommandResult<()> {
    let conn = connection(&db)?;
    conn.execute("DELETE FROM vcc_projects WHERE id = ?", params![id])
        .map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub fn add_vcc_repository(
    input: AddVccRepositoryInput,
    db: State<'_, DbState>,
) -> CommandResult<VccRepository> {
    let Some(url) = normalize_repository_url(&input.url) else {
        return Err("Repository URL is required".to_string());
    };

    let name = normalize_optional(input.name).unwrap_or_else(|| repository_name_from_url(&url));
    let conn = connection(&db)?;
    upsert_vcc_repository(&conn, &name, &url).map_err(db_error)?;
    conn.query_row(
        "SELECT id, name, url, created_at, updated_at
         FROM vcc_repositories
         WHERE url = ?",
        params![url],
        repository_from_row,
    )
    .map_err(db_error)
}

#[tauri::command]
pub fn sync_vcc_repositories(db: State<'_, DbState>) -> CommandResult<Vec<VccRepository>> {
    let conn = connection(&db)?;
    for source in discover_vcc_repository_sources() {
        upsert_vcc_repository(&conn, &source.name, &source.url).map_err(db_error)?;
    }

    list_vcc_repositories(&conn).map_err(db_error)
}

#[tauri::command]
pub fn delete_vcc_repository(id: i64, db: State<'_, DbState>) -> CommandResult<()> {
    let conn = connection(&db)?;
    conn.execute("DELETE FROM vcc_repositories WHERE id = ?", params![id])
        .map_err(db_error)?;
    Ok(())
}

#[tauri::command]
pub fn scan_vcc_project(id: i64, db: State<'_, DbState>) -> CommandResult<VccProjectSnapshot> {
    let conn = connection(&db)?;
    let project = get_project_by_id(&conn, id).map_err(db_error)?;
    let repositories = list_vcc_repositories(&conn).map_err(db_error)?;
    let catalog_packages = read_repository_catalog(&repositories);
    Ok(scan_project(project, &catalog_packages))
}

#[tauri::command]
pub fn scan_vcc_projects(db: State<'_, DbState>) -> CommandResult<Vec<VccProjectSnapshot>> {
    let conn = connection(&db)?;
    snapshot_vcc_projects(&conn)
}
