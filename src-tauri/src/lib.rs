mod commands;
mod db;
mod types;

use commands::{
    assets::{
        create_asset, delete_asset, get_assets, open_file_location, scan_asset_health,
        update_asset, validate_file_path,
    },
    booth::fetch_booth_thumbnail,
    models::{create_model, delete_model, get_models, reorder_models, update_model},
    saves::{export_save, import_save},
    tags::{create_tag, delete_tag, get_tags, reorder_tags, update_tag},
    vcc::{
        add_vcc_project, add_vcc_repository, delete_vcc_project, delete_vcc_repository,
        get_vcc_projects, get_vcc_repositories, scan_vcc_project, scan_vcc_projects,
        sync_vcc_repositories,
    },
};
use std::{env, path::PathBuf};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db_path = match env::var_os("VRC_ASSET_MANAGER_DB_PATH") {
                Some(path) => PathBuf::from(path),
                None => app.path().app_data_dir()?.join("vrc_asset_manager.sqlite3"),
            };
            let seed_demo = env::var("VRC_ASSET_MANAGER_DEMO")
                .map(|value| value != "0" && !value.eq_ignore_ascii_case("false"))
                .unwrap_or(false);
            app.manage(db::init(db_path, seed_demo)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_assets,
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
            fetch_booth_thumbnail,
            validate_file_path,
            open_file_location
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{
        AssetFilters, AssetLinkInput, CreateAssetInput, CreateModelInput, CreateTagInput,
        ReorderModelsInput, ReorderTagsInput, UpdateAssetInput, UpdateModelInput, UpdateTagInput,
    };
    use std::{
        env, fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };
    use tauri::State;

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

    #[test]
    fn demo_database_smoke_test() {
        let (db, demo_root) = demo_db();

        let initial_assets =
            commands::assets::get_assets(AssetFilters::default(), command_state(&db))
                .expect("load seeded assets");
        assert_eq!(initial_assets.len(), 6);
        assert!(initial_assets.iter().all(|asset| asset.file_exists));

        let health = commands::assets::scan_asset_health(command_state(&db))
            .expect("scan demo asset health");
        assert_eq!(health.total, 6);
        assert_eq!(health.ok, 6);
        assert!(health.issues.is_empty());

        let model = commands::models::create_model(
            CreateModelInput {
                name: "smoke-model".to_string(),
                display_name: Some("Smoke Model".to_string()),
            },
            command_state(&db),
        )
        .expect("create model");
        let updated_model = commands::models::update_model(
            model.id,
            UpdateModelInput {
                name: "smoke-model-updated".to_string(),
                display_name: Some("Smoke Model Updated".to_string()),
            },
            command_state(&db),
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
            command_state(&db),
        )
        .expect("create tag");
        let updated_tag = commands::tags::update_tag(
            tag.id,
            UpdateTagInput {
                name: "Smoke Tag Updated".to_string(),
                color: "".to_string(),
            },
            command_state(&db),
        )
        .expect("update tag");
        assert_eq!(updated_tag.color, "#6B7280");

        let mut model_ids = commands::models::get_models(command_state(&db))
            .expect("load models")
            .into_iter()
            .map(|model| model.id)
            .collect::<Vec<_>>();
        model_ids.reverse();
        commands::models::reorder_models(ReorderModelsInput { model_ids }, command_state(&db))
            .expect("reorder models");

        let mut tag_ids = commands::tags::get_tags(command_state(&db))
            .expect("load tags")
            .into_iter()
            .map(|tag| tag.id)
            .collect::<Vec<_>>();
        tag_ids.reverse();
        commands::tags::reorder_tags(ReorderTagsInput { tag_ids }, command_state(&db))
            .expect("reorder tags");

        let asset_dir = demo_root.join("assets").join("Smoke_Test_Asset");
        fs::create_dir_all(&asset_dir).expect("create smoke asset folder");
        fs::write(asset_dir.join("README.txt"), "Smoke test asset").expect("write smoke asset");
        let asset_path = asset_dir.to_string_lossy().to_string();

        assert!(commands::assets::validate_file_path(asset_path.clone()));
        assert!(!commands::assets::validate_file_path(
            demo_root.join("missing").to_string_lossy().to_string()
        ));

        let created_asset = commands::assets::create_asset(
            CreateAssetInput {
                display_name: Some("Smoke Asset".to_string()),
                file_path: asset_path.clone(),
                booth_url: Some("https://example.com/smoke".to_string()),
                thumbnail_url: Some("data:image/svg+xml,%3Csvg%3E%3C/svg%3E".to_string()),
                note: Some("Created by smoke test".to_string()),
                model_ids: vec![updated_model.id],
                tag_ids: vec![updated_tag.id],
                related_links: vec![AssetLinkInput {
                    label: "Docs".to_string(),
                    url: "https://example.com/docs".to_string(),
                }],
            },
            command_state(&db),
        )
        .expect("create asset");
        assert_eq!(created_asset.display_name.as_deref(), Some("Smoke Asset"));
        assert_eq!(created_asset.models.len(), 1);
        assert_eq!(created_asset.tags.len(), 1);
        assert_eq!(created_asset.related_links.len(), 1);

        let updated_asset = commands::assets::update_asset(
            created_asset.id,
            UpdateAssetInput {
                display_name: Some("Smoke Asset Updated".to_string()),
                file_path: asset_path,
                booth_url: None,
                thumbnail_url: None,
                note: Some("Updated by smoke test".to_string()),
                model_ids: vec![updated_model.id],
                tag_ids: vec![updated_tag.id],
                related_links: vec![AssetLinkInput {
                    label: "".to_string(),
                    url: "https://example.com/forum".to_string(),
                }],
            },
            command_state(&db),
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

        let filtered_assets = commands::assets::get_assets(
            AssetFilters {
                search: Some("smoke asset updated".to_string()),
                model_ids: vec![updated_model.id],
                tag_ids: vec![updated_tag.id],
            },
            command_state(&db),
        )
        .expect("filter asset");
        assert_eq!(filtered_assets.len(), 1);
        assert_eq!(filtered_assets[0].id, updated_asset.id);

        let export_path = demo_root.join("vrc-asset-manager-save.json");
        let export_summary = commands::saves::export_save(
            export_path.to_string_lossy().to_string(),
            command_state(&db),
        )
        .expect("export save");
        assert_eq!(export_summary.assets, 7);
        assert!(export_summary.vcc_backup_path.is_some());
        assert!(export_path.is_file());

        commands::assets::delete_asset(updated_asset.id, command_state(&db)).expect("delete asset");
        let after_delete = commands::assets::get_assets(
            AssetFilters {
                search: Some("smoke asset updated".to_string()),
                model_ids: Vec::new(),
                tag_ids: Vec::new(),
            },
            command_state(&db),
        )
        .expect("load after delete");
        assert!(after_delete.is_empty());

        let import_summary = commands::saves::import_save(
            export_path.to_string_lossy().to_string(),
            command_state(&db),
        )
        .expect("import save");
        assert_eq!(import_summary.assets, 7);

        let restored = commands::assets::get_assets(
            AssetFilters {
                search: Some("smoke asset updated".to_string()),
                model_ids: Vec::new(),
                tag_ids: Vec::new(),
            },
            command_state(&db),
        )
        .expect("load restored asset");
        assert_eq!(restored.len(), 1);

        let vcc_projects =
            commands::vcc::get_vcc_projects(command_state(&db)).expect("load vcc projects");
        assert_eq!(vcc_projects.len(), 1);

        let repositories =
            commands::vcc::get_vcc_repositories(command_state(&db)).expect("load vcc repositories");
        assert!(repositories.len() >= 2);

        let snapshots =
            commands::vcc::scan_vcc_projects(command_state(&db)).expect("scan vcc projects");
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
}
