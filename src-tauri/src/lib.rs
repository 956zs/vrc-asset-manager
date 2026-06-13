mod commands;
mod db;
mod types;

use commands::{
    assets::{
        configure_library_root, create_asset, delete_asset, get_assets, get_library_settings,
        inspect_import_sources, list_import_source_contents, list_zip_contents,
        managed_import_batch, open_file_location, preview_managed_import_target, scan_asset_health,
        update_asset, update_library_settings, validate_file_path,
    },
    booth::{fetch_booth_product_info, fetch_booth_thumbnail},
    models::{create_model, delete_model, get_models, reorder_models, update_model},
    saves::{export_save, import_save},
    tags::{create_tag, delete_tag, get_tags, reorder_tags, update_tag},
    vcc::{
        add_vcc_project, add_vcc_repository, delete_vcc_project, delete_vcc_repository,
        get_vcc_projects, get_vcc_repositories, scan_vcc_project, scan_vcc_projects,
        sync_vcc_repositories,
    },
};
use std::{env, error::Error, path::PathBuf};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    app_builder()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn app_builder() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(setup_app)
        .invoke_handler(tauri::generate_handler![
            get_assets,
            get_library_settings,
            configure_library_root,
            update_library_settings,
            inspect_import_sources,
            preview_managed_import_target,
            list_import_source_contents,
            list_zip_contents,
            managed_import_batch,
            create_asset,
            update_asset,
            delete_asset,
            scan_asset_health,
            get_models,
            create_model,
            update_model,
            delete_model,
            reorder_models,
            get_tags,
            create_tag,
            update_tag,
            delete_tag,
            reorder_tags,
            export_save,
            import_save,
            get_vcc_projects,
            get_vcc_repositories,
            add_vcc_project,
            add_vcc_repository,
            delete_vcc_project,
            delete_vcc_repository,
            sync_vcc_repositories,
            scan_vcc_project,
            scan_vcc_projects,
            fetch_booth_product_info,
            fetch_booth_thumbnail,
            validate_file_path,
            open_file_location
        ])
}

fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn Error>> {
    let db_path = database_path(app)?;
    app.manage(db::init(db_path, demo_seed_enabled())?);
    Ok(())
}

fn database_path(app: &tauri::App) -> Result<PathBuf, Box<dyn Error>> {
    match env::var_os("VRC_ASSET_MANAGER_DB_PATH") {
        Some(path) => Ok(PathBuf::from(path)),
        None => Ok(app.path().app_data_dir()?.join("vrc_asset_manager.sqlite3")),
    }
}

fn demo_seed_enabled() -> bool {
    env::var("VRC_ASSET_MANAGER_DEMO")
        .map(|value| value != "0" && !value.eq_ignore_ascii_case("false"))
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{
        Asset, AssetCategory, AssetFilters, AssetLinkInput, CreateAssetInput, CreateModelInput,
        CreateTagInput, ReorderModelsInput, ReorderTagsInput, UpdateAssetInput, UpdateModelInput,
        UpdateTagInput,
    };
    use std::{
        env, fs,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };
    use tauri::State;

    static TEST_ENV_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    fn lock_test_env() -> std::sync::MutexGuard<'static, ()> {
        TEST_ENV_LOCK.lock().expect("lock test environment")
    }

    fn unique_demo_root() -> PathBuf {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after UNIX_EPOCH")
            .as_millis();
        env::temp_dir().join(format!(
            "vrc-asset-manager-demo-smoke-{}-{now}",
            std::process::id()
        ))
    }

    fn demo_db() -> (db::DbState, PathBuf) {
        let demo_root = unique_demo_root();
        let db_path = demo_root.join("vrc_asset_manager.sqlite3");

        fs::create_dir_all(&demo_root).expect("create demo root");
        env::set_var("VRC_ASSET_MANAGER_DEMO_ROOT", &demo_root);
        env::set_var("VRC_ASSET_MANAGER_DB_PATH", &db_path);
        env::set_var("LOCALAPPDATA", demo_root.join("LocalAppData"));

        let db = db::init(db_path, true).expect("initialize demo database");

        (db, demo_root)
    }

    fn command_state(db: &db::DbState) -> State<'_, db::DbState> {
        // Tauri's State is a single-reference command guard. The public constructor is only
        // available through the runtime state manager, so tests create the same wrapper directly
        // to exercise command functions without launching a GUI runtime.
        unsafe { std::mem::transmute::<&db::DbState, State<'_, db::DbState>>(db) }
    }

    fn asset_by_id(assets: &[Asset], asset_id: i64) -> &Asset {
        assets
            .iter()
            .find(|asset| asset.id == asset_id)
            .expect("asset should exist")
    }

    fn assert_asset_relations(asset: &Asset, model_ids: &[i64], tag_ids: &[i64]) {
        let actual_model_ids = asset
            .models
            .iter()
            .map(|model| model.id)
            .collect::<Vec<_>>();
        let actual_tag_ids = asset.tags.iter().map(|tag| tag.id).collect::<Vec<_>>();

        assert_eq!(actual_model_ids, model_ids);
        assert_eq!(actual_tag_ids, tag_ids);
    }

    fn assert_asset_links(asset: &Asset, links: &[(&str, &str)]) {
        let actual_links = asset
            .related_links
            .iter()
            .map(|link| (link.label.as_str(), link.url.as_str()))
            .collect::<Vec<_>>();

        assert_eq!(actual_links.as_slice(), links);
    }

    #[cfg(unix)]
    fn create_health_asset(db: &db::DbState, display_name: &str, file_path: PathBuf) {
        commands::assets::create_asset(
            CreateAssetInput {
                display_name: Some(display_name.to_string()),
                category: AssetCategory::Accessory,
                file_path: file_path.to_string_lossy().to_string(),
                booth_url: None,
                thumbnail_url: None,
                note: None,
                model_ids: Vec::new(),
                tag_ids: Vec::new(),
                related_links: Vec::new(),
            },
            command_state(db),
        )
        .expect("create health-check asset");
    }

    #[cfg(unix)]
    fn issue_status<'a>(
        health: &'a commands::assets::AssetHealthSummary,
        display_name: &str,
    ) -> &'a str {
        health
            .issues
            .iter()
            .find(|issue| issue.display_name.as_deref() == Some(display_name))
            .map(|issue| issue.status.as_str())
            .expect("health issue should exist")
    }

    #[derive(Clone, Copy)]
    struct SmokeRelations {
        model_id: i64,
        tag_id: i64,
    }

    struct SmokeAssetConfig {
        asset_path: String,
        relations: SmokeRelations,
    }

    fn assert_seeded_assets(db: &db::DbState) {
        let initial_assets =
            commands::assets::get_assets(AssetFilters::default(), command_state(db))
                .expect("load seeded assets");
        assert_eq!(initial_assets.len(), 6);
        assert!(initial_assets.iter().all(|asset| asset.file_exists));

        let seeded_asset = asset_by_id(&initial_assets, 1);
        assert_asset_relations(seeded_asset, &[1, 2], &[1, 6]);
        assert_asset_links(
            seeded_asset,
            &[
                ("Forum thread", "https://example.com/demo/aurora-thread"),
                ("Setup notes", "https://example.com/demo/aurora-setup"),
            ],
        );
    }

    fn assert_demo_health(db: &db::DbState) {
        let health =
            commands::assets::scan_asset_health(command_state(db)).expect("scan demo asset health");
        assert_eq!(health.total, 6);
        assert_eq!(health.ok, 6);
        assert!(health.issues.is_empty());
    }

    fn create_smoke_relations(db: &db::DbState) -> SmokeRelations {
        let model = commands::models::create_model(
            CreateModelInput {
                name: "smoke-model".to_string(),
                display_name: Some("Smoke Model".to_string()),
            },
            command_state(db),
        )
        .expect("create model");
        let updated_model = commands::models::update_model(
            model.id,
            UpdateModelInput {
                name: "smoke-model-updated".to_string(),
                display_name: Some("Smoke Model Updated".to_string()),
            },
            command_state(db),
        )
        .expect("update model");
        assert_eq!(
            updated_model.display_name.as_deref(),
            Some("Smoke Model Updated")
        );

        let tag = commands::tags::create_tag(
            CreateTagInput {
                name: "Smoke Tag".to_string(),
                color: "#123456".to_string(),
            },
            command_state(db),
        )
        .expect("create tag");
        let updated_tag = commands::tags::update_tag(
            tag.id,
            UpdateTagInput {
                name: "Smoke Tag Updated".to_string(),
                color: "".to_string(),
            },
            command_state(db),
        )
        .expect("update tag");
        assert_eq!(updated_tag.color, "#6B7280");

        SmokeRelations {
            model_id: updated_model.id,
            tag_id: updated_tag.id,
        }
    }

    fn reverse_model_and_tag_order(db: &db::DbState) {
        let mut model_ids = commands::models::get_models(command_state(db))
            .expect("load models")
            .into_iter()
            .map(|model| model.id)
            .collect::<Vec<_>>();
        model_ids.reverse();
        commands::models::reorder_models(ReorderModelsInput { model_ids }, command_state(db))
            .expect("reorder models");

        let mut tag_ids = commands::tags::get_tags(command_state(db))
            .expect("load tags")
            .into_iter()
            .map(|tag| tag.id)
            .collect::<Vec<_>>();
        tag_ids.reverse();
        commands::tags::reorder_tags(ReorderTagsInput { tag_ids }, command_state(db))
            .expect("reorder tags");
    }

    fn smoke_asset_config(demo_root: &Path, relations: SmokeRelations) -> SmokeAssetConfig {
        let asset_dir = demo_root.join("assets").join("Smoke_Test_Asset");
        fs::create_dir_all(&asset_dir).expect("create smoke asset folder");
        fs::write(asset_dir.join("README.txt"), "Smoke test asset").expect("write smoke asset");
        let asset_path = asset_dir.to_string_lossy().to_string();

        assert!(commands::assets::validate_file_path(asset_path.clone()));
        assert!(!commands::assets::validate_file_path(
            demo_root.join("missing").to_string_lossy().to_string()
        ));

        SmokeAssetConfig {
            asset_path,
            relations,
        }
    }

    fn create_smoke_asset(db: &db::DbState, config: &SmokeAssetConfig) -> i64 {
        let created_asset = commands::assets::create_asset(
            CreateAssetInput {
                display_name: Some("Smoke Asset".to_string()),
                category: AssetCategory::Accessory,
                file_path: config.asset_path.clone(),
                booth_url: Some("https://example.com/smoke".to_string()),
                thumbnail_url: Some("data:image/svg+xml,%3Csvg%3E%3C/svg%3E".to_string()),
                note: Some("Created by smoke test".to_string()),
                model_ids: vec![config.relations.model_id],
                tag_ids: vec![config.relations.tag_id],
                related_links: vec![AssetLinkInput {
                    label: "Docs".to_string(),
                    url: "https://example.com/docs".to_string(),
                }],
            },
            command_state(db),
        )
        .expect("create asset");
        assert_eq!(created_asset.display_name.as_deref(), Some("Smoke Asset"));
        assert_eq!(created_asset.models.len(), 1);
        assert_eq!(created_asset.tags.len(), 1);
        assert_eq!(created_asset.related_links.len(), 1);
        created_asset.id
    }

    fn update_smoke_asset(db: &db::DbState, asset_id: i64, config: &SmokeAssetConfig) {
        let updated_asset = commands::assets::update_asset(
            asset_id,
            UpdateAssetInput {
                display_name: Some("Smoke Asset Updated".to_string()),
                category: AssetCategory::Accessory,
                file_path: config.asset_path.clone(),
                booth_url: None,
                thumbnail_url: None,
                note: Some("Updated by smoke test".to_string()),
                model_ids: vec![config.relations.model_id],
                tag_ids: vec![config.relations.tag_id],
                related_links: vec![AssetLinkInput {
                    label: "".to_string(),
                    url: "https://example.com/forum".to_string(),
                }],
            },
            command_state(db),
        )
        .expect("update asset");
        assert_eq!(
            updated_asset.display_name.as_deref(),
            Some("Smoke Asset Updated")
        );
        assert_eq!(
            updated_asset.related_links[0].label,
            "https://example.com/forum"
        );
    }

    fn assert_filtered_smoke_asset(db: &db::DbState, asset_id: i64, relations: SmokeRelations) {
        let filtered_assets = commands::assets::get_assets(
            AssetFilters {
                search: Some("smoke asset updated".to_string()),
                category: None,
                model_ids: vec![relations.model_id],
                tag_ids: vec![relations.tag_id],
                ..AssetFilters::default()
            },
            command_state(db),
        )
        .expect("filter asset");
        assert_eq!(filtered_assets.len(), 1);
        assert_eq!(filtered_assets[0].id, asset_id);
        assert_asset_relations(
            &filtered_assets[0],
            &[relations.model_id],
            &[relations.tag_id],
        );
        assert_asset_links(
            &filtered_assets[0],
            &[("https://example.com/forum", "https://example.com/forum")],
        );
    }

    fn set_library_settings(
        db: &db::DbState,
        root_path: &Path,
        avatar_folder: &str,
        accessory_folder: &str,
        world_folder: &str,
    ) {
        commands::assets::update_library_settings(
            commands::assets::UpdateLibrarySettingsInput {
                root_path: Some(root_path.to_string_lossy().to_string()),
                avatar_folder: avatar_folder.to_string(),
                accessory_folder: accessory_folder.to_string(),
                world_folder: world_folder.to_string(),
            },
            command_state(db),
        )
        .expect("update library settings");
    }

    fn assert_exported_library_settings(export_path: &Path, expected_root: &Path) {
        let json = fs::read_to_string(export_path).expect("read exported save");
        let archive: serde_json::Value = serde_json::from_str(&json).expect("parse exported save");
        let settings = archive
            .get("librarySettings")
            .expect("library settings should be exported as reference");

        assert_eq!(
            settings.get("rootPath").and_then(|value| value.as_str()),
            Some(expected_root.to_string_lossy().as_ref())
        );
        assert_eq!(
            settings
                .get("avatarFolder")
                .and_then(|value| value.as_str()),
            Some("Exported Avatars")
        );
        assert_eq!(
            settings
                .get("accessoryFolder")
                .and_then(|value| value.as_str()),
            Some("Exported Accessories")
        );
        assert_eq!(
            settings.get("worldFolder").and_then(|value| value.as_str()),
            Some("Exported Worlds")
        );

        let exported_assets = archive
            .get("assets")
            .and_then(|value| value.as_array())
            .expect("assets should be exported");
        let smoke_asset = exported_assets
            .iter()
            .find(|asset| {
                asset.get("displayName").and_then(|value| value.as_str())
                    == Some("Smoke Asset Updated")
            })
            .expect("smoke asset should be exported");
        assert_eq!(
            smoke_asset.get("category").and_then(|value| value.as_str()),
            Some("accessory")
        );
    }

    fn assert_current_library_settings(db: &db::DbState, expected_root: &Path) {
        let settings =
            commands::assets::get_library_settings(command_state(db)).expect("load settings");
        assert_eq!(
            settings.root_path.as_deref(),
            Some(expected_root.to_string_lossy().as_ref())
        );
        assert_eq!(settings.avatar_folder, "Current Avatars");
        assert_eq!(settings.accessory_folder, "Current Accessories");
        assert_eq!(settings.world_folder, "Current Worlds");
    }

    fn export_smoke_save(db: &db::DbState, demo_root: &Path) -> PathBuf {
        let export_path = demo_root.join("vrc-asset-manager-save.json");
        let export_summary = commands::saves::export_save(
            export_path.to_string_lossy().to_string(),
            command_state(db),
        )
        .expect("export save");
        assert_eq!(export_summary.assets, 7);
        assert_eq!(export_summary.vcc_backup_files, 4);
        assert_eq!(export_summary.vcc_cached_repositories, 2);

        let vcc_backup_path = PathBuf::from(
            export_summary
                .vcc_backup_path
                .as_deref()
                .expect("vcc backup path"),
        );
        assert!(vcc_backup_path.join("README.txt").is_file());
        assert!(vcc_backup_path.join("vcc-backup.json").is_file());
        assert!(vcc_backup_path
            .join("vcc-local")
            .join("Repos")
            .join("official-demo.json")
            .is_file());
        assert!(vcc_backup_path
            .join("vcc-local")
            .join("Repos")
            .join("curated-demo.json")
            .is_file());
        assert!(export_path.is_file());
        assert_exported_library_settings(&export_path, &demo_root.join("exported-library"));

        export_path
    }

    fn delete_smoke_asset(db: &db::DbState, asset_id: i64) {
        commands::assets::delete_asset(asset_id, command_state(db)).expect("delete asset");
        let after_delete = commands::assets::get_assets(
            AssetFilters {
                search: Some("smoke asset updated".to_string()),
                category: None,
                model_ids: Vec::new(),
                tag_ids: Vec::new(),
                ..AssetFilters::default()
            },
            command_state(db),
        )
        .expect("load after delete");
        assert!(after_delete.is_empty());
    }

    fn import_smoke_save(db: &db::DbState, export_path: &Path, relations: SmokeRelations) {
        let import_summary = commands::saves::import_save(
            export_path.to_string_lossy().to_string(),
            command_state(db),
        )
        .expect("import save");
        assert_eq!(import_summary.assets, 7);

        let restored = commands::assets::get_assets(
            AssetFilters {
                search: Some("smoke asset updated".to_string()),
                category: None,
                model_ids: Vec::new(),
                tag_ids: Vec::new(),
                ..AssetFilters::default()
            },
            command_state(db),
        )
        .expect("load restored asset");
        assert_eq!(restored.len(), 1);
        assert_eq!(restored[0].category, AssetCategory::Accessory);
        assert_asset_relations(&restored[0], &[relations.model_id], &[relations.tag_id]);
        assert_asset_links(
            &restored[0],
            &[("https://example.com/forum", "https://example.com/forum")],
        );
    }

    #[test]
    fn managed_import_batch_preserves_optional_metadata() {
        let _env_guard = lock_test_env();
        let (db, demo_root) = demo_db();
        let library_root = demo_root.join("managed-library");
        set_library_settings(&db, &library_root, "Avatars", "Accessories", "Worlds");

        let relations = create_smoke_relations(&db);
        let source_root = demo_root.join("import-sources");
        let metadata_source = source_root.join("Metadata_Source");
        let plain_source = source_root.join("Plain_Source");
        fs::create_dir_all(&metadata_source).expect("create metadata source");
        fs::create_dir_all(&plain_source).expect("create plain source");
        fs::write(metadata_source.join("README.txt"), "metadata import")
            .expect("write metadata source");
        fs::write(plain_source.join("README.txt"), "plain import").expect("write plain source");

        let report = commands::assets::managed_import_batch(
            commands::assets::ManagedImportBatchInput {
                items: vec![
                    commands::assets::ManagedImportItemInput {
                        source_path: metadata_source.to_string_lossy().to_string(),
                        category: AssetCategory::Accessory,
                        operation: commands::assets::ImportOperation::Copy,
                        archive_strategy: None,
                        conflict_strategy: Some(commands::assets::ConflictStrategy::Cancel),
                        display_name: Some("Imported Metadata Asset".to_string()),
                        booth_url: Some("https://booth.pm/ja/items/12345".to_string()),
                        thumbnail_url: Some("https://example.com/thumb.png".to_string()),
                        note: Some("Imported through managed batch".to_string()),
                        model_ids: vec![relations.model_id],
                        tag_ids: vec![relations.tag_id],
                        related_links: Vec::new(),
                    },
                    commands::assets::ManagedImportItemInput {
                        source_path: plain_source.to_string_lossy().to_string(),
                        category: AssetCategory::World,
                        operation: commands::assets::ImportOperation::Copy,
                        archive_strategy: None,
                        conflict_strategy: Some(commands::assets::ConflictStrategy::Cancel),
                        display_name: Some("Imported Without Booth".to_string()),
                        booth_url: None,
                        thumbnail_url: None,
                        note: None,
                        model_ids: Vec::new(),
                        tag_ids: Vec::new(),
                        related_links: Vec::new(),
                    },
                ],
            },
            command_state(&db),
        )
        .expect("managed import batch");

        assert_eq!(report.total, 2);
        assert_eq!(report.succeeded, 2);
        assert_eq!(report.failed, 0);

        let imported_assets =
            commands::assets::get_assets(AssetFilters::default(), command_state(&db))
                .expect("load imported assets");
        let metadata_asset = imported_assets
            .iter()
            .find(|asset| asset.display_name.as_deref() == Some("Imported Metadata Asset"))
            .expect("metadata asset should be created");
        assert_eq!(metadata_asset.category, AssetCategory::Accessory);
        assert_eq!(
            metadata_asset.booth_url.as_deref(),
            Some("https://booth.pm/ja/items/12345")
        );
        assert_eq!(
            metadata_asset.thumbnail_url.as_deref(),
            Some("https://example.com/thumb.png")
        );
        assert_eq!(
            metadata_asset.note.as_deref(),
            Some("Imported through managed batch")
        );
        assert_asset_relations(metadata_asset, &[relations.model_id], &[relations.tag_id]);
        assert!(metadata_asset
            .file_path
            .starts_with(&library_root.to_string_lossy().to_string()));

        let plain_asset = imported_assets
            .iter()
            .find(|asset| asset.display_name.as_deref() == Some("Imported Without Booth"))
            .expect("plain asset should be created");
        assert_eq!(plain_asset.category, AssetCategory::World);
        assert!(plain_asset.booth_url.is_none());
        assert!(plain_asset.thumbnail_url.is_none());
        assert!(plain_asset.note.is_none());
    }

    #[test]
    fn managed_import_batch_handles_rename_conflict_and_unsupported_sources() {
        let _env_guard = lock_test_env();
        let (db, demo_root) = demo_db();
        let library_root = demo_root.join("managed-library");
        set_library_settings(&db, &library_root, "Avatars", "Accessories", "Worlds");

        let source_root = demo_root.join("conflict-sources");
        let first_source = source_root.join("first").join("Same_Name");
        let second_source = source_root.join("second").join("Same_Name");
        let unsupported_source = source_root.join("Unsupported.rar");
        fs::create_dir_all(&first_source).expect("create first source");
        fs::create_dir_all(&second_source).expect("create second source");
        fs::write(first_source.join("README.txt"), "first").expect("write first source");
        fs::write(second_source.join("README.txt"), "second").expect("write second source");
        fs::write(&unsupported_source, "rar placeholder").expect("write unsupported source");

        let report = commands::assets::managed_import_batch(
            commands::assets::ManagedImportBatchInput {
                items: vec![
                    commands::assets::ManagedImportItemInput {
                        source_path: first_source.to_string_lossy().to_string(),
                        category: AssetCategory::Accessory,
                        operation: commands::assets::ImportOperation::Copy,
                        archive_strategy: None,
                        conflict_strategy: Some(commands::assets::ConflictStrategy::Cancel),
                        display_name: Some("First Conflict Asset".to_string()),
                        booth_url: None,
                        thumbnail_url: None,
                        note: None,
                        model_ids: Vec::new(),
                        tag_ids: Vec::new(),
                        related_links: Vec::new(),
                    },
                    commands::assets::ManagedImportItemInput {
                        source_path: second_source.to_string_lossy().to_string(),
                        category: AssetCategory::Accessory,
                        operation: commands::assets::ImportOperation::Copy,
                        archive_strategy: None,
                        conflict_strategy: Some(commands::assets::ConflictStrategy::Rename),
                        display_name: Some("Renamed Conflict Asset".to_string()),
                        booth_url: None,
                        thumbnail_url: None,
                        note: None,
                        model_ids: Vec::new(),
                        tag_ids: Vec::new(),
                        related_links: Vec::new(),
                    },
                    commands::assets::ManagedImportItemInput {
                        source_path: unsupported_source.to_string_lossy().to_string(),
                        category: AssetCategory::Accessory,
                        operation: commands::assets::ImportOperation::Copy,
                        archive_strategy: None,
                        conflict_strategy: Some(commands::assets::ConflictStrategy::Cancel),
                        display_name: Some("Unsupported Asset".to_string()),
                        booth_url: None,
                        thumbnail_url: None,
                        note: None,
                        model_ids: Vec::new(),
                        tag_ids: Vec::new(),
                        related_links: Vec::new(),
                    },
                ],
            },
            command_state(&db),
        )
        .expect("managed import batch with conflicts");

        assert_eq!(report.total, 3);
        assert_eq!(report.succeeded, 2);
        assert_eq!(report.failed, 1);
        assert!(report.results[0].success);
        assert!(report.results[1].success);
        assert!(!report.results[2].success);
        assert!(report.results[2].final_path.is_none());
        assert!(report.results[2].message.contains("第一版只支援"));

        let first_path = PathBuf::from(report.results[0].final_path.as_deref().unwrap());
        let renamed_path = PathBuf::from(report.results[1].final_path.as_deref().unwrap());
        assert!(first_path.exists());
        assert!(renamed_path.exists());
        assert_ne!(first_path, renamed_path);
        assert_eq!(
            first_path.file_name().and_then(|name| name.to_str()),
            Some("Same_Name")
        );
        assert_eq!(
            renamed_path.file_name().and_then(|name| name.to_str()),
            Some("Same_Name (1)")
        );

        let imported_assets =
            commands::assets::get_assets(AssetFilters::default(), command_state(&db))
                .expect("load imported assets");
        assert!(imported_assets
            .iter()
            .any(|asset| asset.display_name.as_deref() == Some("First Conflict Asset")));
        assert!(imported_assets
            .iter()
            .any(|asset| asset.display_name.as_deref() == Some("Renamed Conflict Asset")));
        assert!(!imported_assets
            .iter()
            .any(|asset| asset.display_name.as_deref() == Some("Unsupported Asset")));
    }

    #[test]
    fn managed_import_batch_reports_db_failure_after_file_operation() {
        let _env_guard = lock_test_env();
        let (db, demo_root) = demo_db();
        let library_root = demo_root.join("managed-library");
        set_library_settings(&db, &library_root, "Avatars", "Accessories", "Worlds");

        let source_root = demo_root.join("db-failure-source");
        let source = source_root.join("Db_Record_Fails");
        fs::create_dir_all(&source).expect("create source");
        fs::write(source.join("README.txt"), "file operation should complete")
            .expect("write source file");

        let report = commands::assets::managed_import_batch(
            commands::assets::ManagedImportBatchInput {
                items: vec![commands::assets::ManagedImportItemInput {
                    source_path: source.to_string_lossy().to_string(),
                    category: AssetCategory::Accessory,
                    operation: commands::assets::ImportOperation::Copy,
                    archive_strategy: None,
                    conflict_strategy: Some(commands::assets::ConflictStrategy::Cancel),
                    display_name: Some("DB Failure Asset".to_string()),
                    booth_url: None,
                    thumbnail_url: None,
                    note: None,
                    model_ids: vec![9_999_999],
                    tag_ids: Vec::new(),
                    related_links: Vec::new(),
                }],
            },
            command_state(&db),
        )
        .expect("managed import batch with DB failure");

        assert_eq!(report.total, 1);
        assert_eq!(report.succeeded, 0);
        assert_eq!(report.failed, 1);

        let result = &report.results[0];
        assert!(!result.success);
        assert!(
            result
                .message
                .contains("檔案已處理，但資料庫記錄建立失敗"),
            "unexpected report message: {}",
            result.message
        );

        let final_path = PathBuf::from(result.final_path.as_deref().expect("final path"));
        assert!(final_path.exists());
        assert!(final_path.join("README.txt").exists());

        let imported_assets =
            commands::assets::get_assets(AssetFilters::default(), command_state(&db))
                .expect("load imported assets");
        assert!(!imported_assets
            .iter()
            .any(|asset| asset.display_name.as_deref() == Some("DB Failure Asset")));
    }

    fn assert_vcc_snapshot(db: &db::DbState) {
        let vcc_projects =
            commands::vcc::get_vcc_projects(command_state(db)).expect("load vcc projects");
        assert_eq!(vcc_projects.len(), 1);

        let repositories =
            commands::vcc::get_vcc_repositories(command_state(db)).expect("load vcc repositories");
        assert!(repositories.len() >= 2);

        let snapshots =
            commands::vcc::scan_vcc_projects(command_state(db)).expect("scan vcc projects");
        assert_eq!(snapshots.len(), 1);
        assert!(snapshots[0].scan_error.is_none());
        assert!(snapshots[0]
            .packages
            .iter()
            .any(|package| package.package_id == "com.example.pose-helper"
                && package.installed
                && package.available
                && package.requested_version.as_deref() == Some("1.2.0")
                && package.installed_version.as_deref() == Some("1.1.0")));
    }

    #[cfg(unix)]
    #[test]
    fn asset_health_reports_path_states() {
        use std::os::unix::net::UnixListener;

        let _env_guard = lock_test_env();
        let (db, demo_root) = demo_db();
        let health_root = demo_root.join("health-fixtures");
        fs::create_dir_all(&health_root).expect("create health fixtures");

        let missing_path = health_root.join("missing.asset");
        create_health_asset(&db, "Missing Asset", missing_path);

        let empty_file = health_root.join("empty-file.txt");
        fs::write(&empty_file, "").expect("create empty file");
        create_health_asset(&db, "Empty File Asset", empty_file);

        let empty_dir = health_root.join("empty-directory");
        fs::create_dir(&empty_dir).expect("create empty directory");
        create_health_asset(&db, "Empty Directory Asset", empty_dir);

        let socket_path = health_root.join("unsupported.sock");
        let _socket = UnixListener::bind(&socket_path).expect("create socket fixture");
        create_health_asset(&db, "Unsupported Asset", socket_path);

        let health = commands::assets::scan_asset_health(command_state(&db))
            .expect("scan asset health states");
        assert_eq!(health.total, 10);
        assert_eq!(health.ok, 6);
        assert_eq!(health.missing, 1);
        assert_eq!(health.unreadable, 0);
        assert_eq!(health.empty_files, 1);
        assert_eq!(health.empty_directories, 1);
        assert_eq!(health.unsupported, 1);
        assert_eq!(health.issues.len(), 4);
        assert_eq!(issue_status(&health, "Missing Asset"), "missing");
        assert_eq!(issue_status(&health, "Empty File Asset"), "emptyFile");
        assert_eq!(
            issue_status(&health, "Empty Directory Asset"),
            "emptyDirectory"
        );
        assert_eq!(issue_status(&health, "Unsupported Asset"), "unsupported");
    }

    #[test]
    fn demo_database_smoke_test() {
        let _env_guard = lock_test_env();
        let (db, demo_root) = demo_db();

        assert_seeded_assets(&db);
        assert_demo_health(&db);

        let relations = create_smoke_relations(&db);
        reverse_model_and_tag_order(&db);

        let asset_config = smoke_asset_config(&demo_root, relations);
        let asset_id = create_smoke_asset(&db, &asset_config);
        update_smoke_asset(&db, asset_id, &asset_config);
        assert_filtered_smoke_asset(&db, asset_id, relations);

        set_library_settings(
            &db,
            &demo_root.join("exported-library"),
            "Exported Avatars",
            "Exported Accessories",
            "Exported Worlds",
        );
        let export_path = export_smoke_save(&db, &demo_root);
        set_library_settings(
            &db,
            &demo_root.join("current-library"),
            "Current Avatars",
            "Current Accessories",
            "Current Worlds",
        );
        delete_smoke_asset(&db, asset_id);
        import_smoke_save(&db, &export_path, relations);
        assert_current_library_settings(&db, &demo_root.join("current-library"));
        assert_vcc_snapshot(&db);
    }
}
