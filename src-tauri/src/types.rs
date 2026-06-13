use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fmt;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AssetCategory {
    Avatar,
    #[default]
    Accessory,
    World,
}

impl AssetCategory {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Avatar => "avatar",
            Self::Accessory => "accessory",
            Self::World => "world",
        }
    }
}

impl fmt::Display for AssetCategory {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl std::str::FromStr for AssetCategory {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "avatar" => Ok(Self::Avatar),
            "accessory" => Ok(Self::Accessory),
            "world" => Ok(Self::World),
            _ => Err(format!("Unsupported asset category: {value}")),
        }
    }
}

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
    pub category: AssetCategory,
    pub file_path: String,
    pub booth_url: Option<String>,
    pub booth_shop_name: Option<String>,
    pub booth_shop_url: Option<String>,
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
    pub category: Option<AssetCategory>,
    #[serde(default)]
    pub model_ids: Vec<i64>,
    #[serde(default)]
    pub tag_ids: Vec<i64>,
    #[serde(default)]
    pub shop_filters: Vec<BoothShopFilter>,
    #[serde(default)]
    pub status_filters: Vec<AssetStatusFilter>,
    #[serde(default)]
    pub sort_order: AssetSortOrder,
}

#[derive(Debug, Clone, Copy, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum AssetSortOrder {
    #[default]
    UpdatedDesc,
    CreatedDesc,
    NameAsc,
    NameDesc,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum AssetStatusFilter {
    MissingFile,
    MissingBoothUrl,
    MissingThumbnail,
    MissingRelatedLinks,
    MissingModels,
    MissingTags,
    MissingNote,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BoothShopFilter {
    pub name: String,
    pub url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAssetInput {
    pub display_name: Option<String>,
    #[serde(default)]
    pub category: AssetCategory,
    pub file_path: String,
    pub booth_url: Option<String>,
    pub booth_shop_name: Option<String>,
    pub booth_shop_url: Option<String>,
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
    #[serde(default)]
    pub category: AssetCategory,
    pub file_path: String,
    pub booth_url: Option<String>,
    pub booth_shop_name: Option<String>,
    pub booth_shop_url: Option<String>,
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
