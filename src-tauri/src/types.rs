use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Model {
    pub id: i64,
    pub name: String,
    pub display_name: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetLink {
    pub id: i64,
    pub label: String,
    pub url: String,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub id: i64,
    pub name: String,
    pub display_name: Option<String>,
    pub file_path: String,
    pub booth_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub models: Vec<Model>,
    pub tags: Vec<Tag>,
    pub related_links: Vec<AssetLink>,
    pub file_exists: bool,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetFilters {
    #[serde(default)]
    pub search: Option<String>,
    #[serde(default)]
    pub model_ids: Vec<i64>,
    #[serde(default)]
    pub tag_ids: Vec<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAssetInput {
    pub display_name: Option<String>,
    pub file_path: String,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAssetInput {
    pub display_name: Option<String>,
    pub file_path: String,
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
pub struct AssetLinkInput {
    pub label: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VccProject {
    pub id: i64,
    pub name: String,
    pub path: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VccPackage {
    pub package_id: String,
    pub display_name: Option<String>,
    pub requested_version: Option<String>,
    pub installed_version: Option<String>,
    #[serde(default)]
    pub latest_version: Option<String>,
    pub source: Option<String>,
    pub installed: bool,
    #[serde(default)]
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VccProjectSnapshot {
    pub project: VccProject,
    pub packages: Vec<VccPackage>,
    pub vpm_manifest: Option<Value>,
    pub unity_manifest: Option<Value>,
    pub scanned_at: String,
    pub scan_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VccRepository {
    pub id: i64,
    pub name: String,
    pub url: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddVccProjectInput {
    pub path: String,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddVccRepositoryInput {
    pub name: Option<String>,
    pub url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateModelInput {
    pub name: String,
    pub display_name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateModelInput {
    pub name: String,
    pub display_name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderModelsInput {
    #[serde(default)]
    pub model_ids: Vec<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTagInput {
    pub name: String,
    pub color: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTagInput {
    pub name: String,
    pub color: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderTagsInput {
    #[serde(default)]
    pub tag_ids: Vec<i64>,
}
