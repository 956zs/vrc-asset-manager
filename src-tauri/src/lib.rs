mod commands;
mod db;
mod types;

use commands::{
    assets::{
        backfill_booth_shop_metadata, configure_library_root, create_asset, delete_asset,
        get_assets, get_booth_shop_options, get_library_settings, inspect_import_sources,
        list_import_source_contents, list_zip_contents, managed_import_batch, open_file_location,
        preview_managed_import_target, scan_asset_health, update_asset, update_library_settings,
    },
    booth::fetch_booth_product_info,
    models::{create_model, delete_model, get_models, reorder_models, update_model},
    saves::{export_save, import_save},
    tags::{create_tag, delete_tag, get_tags, reorder_tags, update_tag},
    vcc::{
        add_vcc_project, add_vcc_repository, delete_vcc_project, delete_vcc_repository,
        get_vcc_repositories, scan_vcc_project, scan_vcc_projects, sync_vcc_repositories,
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
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(setup_app)
        .invoke_handler(tauri::generate_handler![
            get_assets,
            get_booth_shop_options,
            backfill_booth_shop_metadata,
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
            get_vcc_repositories,
            add_vcc_project,
            add_vcc_repository,
            delete_vcc_project,
            delete_vcc_repository,
            sync_vcc_repositories,
            scan_vcc_project,
            scan_vcc_projects,
            fetch_booth_product_info,
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
#[path = "lib_tests.rs"]
mod tests;
