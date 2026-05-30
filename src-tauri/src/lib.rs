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
