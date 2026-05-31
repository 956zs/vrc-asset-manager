use scraper::{Html, Selector};
use std::time::Duration;

use super::{db_error, CommandResult, HTTP_USER_AGENT};

pub fn fetch_thumbnail_url(url: &str) -> CommandResult<Option<String>> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent(HTTP_USER_AGENT)
        .build()
        .map_err(db_error)?;

    let html = client
        .get(trimmed)
        .send()
        .and_then(|response| response.error_for_status())
        .map_err(db_error)?
        .text()
        .map_err(db_error)?;

    let document = Html::parse_document(&html);
    let selector =
        Selector::parse(r#"meta[property="og:image"], meta[name="og:image"]"#).map_err(db_error)?;

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
