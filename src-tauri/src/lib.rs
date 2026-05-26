mod commands;
mod db;
mod types;

use commands::{
    assets::{
        create_asset, delete_asset, get_assets, open_file_location, update_asset,
        validate_file_path,
    },
    booth::fetch_booth_thumbnail,
    models::{create_model, delete_model, get_models, update_model},
    saves::{export_save, import_save},
    tags::{create_tag, delete_tag, get_tags, update_tag},
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db_path = app.path().app_data_dir()?.join("vrc_asset_manager.sqlite3");
            app.manage(db::init(db_path)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_assets,
            create_asset,
            update_asset,
            delete_asset,
            get_models,
            create_model,
            update_model,
            delete_model,
            get_tags,
            create_tag,
            update_tag,
            delete_tag,
            export_save,
            import_save,
            fetch_booth_thumbnail,
            validate_file_path,
            open_file_location
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
