use scraper::{Html, Selector};
use std::time::Duration;

use super::CommandResult;

pub fn fetch_thumbnail_url(url: &str) -> CommandResult<Option<String>> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent("VRC Asset Manager/0.1")
        .build()
        .map_err(|error| error.to_string())?;

    let html = client
        .get(trimmed)
        .send()
        .and_then(|response| response.error_for_status())
        .map_err(|error| error.to_string())?
        .text()
        .map_err(|error| error.to_string())?;

    let document = Html::parse_document(&html);
    let selector = Selector::parse(r#"meta[property="og:image"], meta[name="og:image"]"#)
        .map_err(|error| error.to_string())?;

    Ok(document.select(&selector).find_map(|element| {
        element
            .value()
            .attr("content")
            .map(str::trim)
            .filter(|content| !content.is_empty())
            .map(ToOwned::to_owned)
    }))
}

#[tauri::command]
pub fn fetch_booth_thumbnail(url: String) -> CommandResult<Option<String>> {
    fetch_thumbnail_url(&url)
}
