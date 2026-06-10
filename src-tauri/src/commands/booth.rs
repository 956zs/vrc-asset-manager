use reqwest::header::{ACCEPT_LANGUAGE, COOKIE};
use scraper::{Html, Selector};
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeSet;
use std::time::Duration;

use super::{db_error, CommandResult, HTTP_USER_AGENT};

const BOOTH_ADULT_COOKIE: &str = "adult=t";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoothProductInfo {
    pub title: Option<String>,
    pub thumbnail_url: Option<String>,
    pub tags: Vec<String>,
    pub search_text: String,
}

fn fetch_booth_html(url: &str) -> CommandResult<Option<String>> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent(HTTP_USER_AGENT)
        .build()
        .map_err(db_error)?;

    let mut request = client.get(trimmed).header(
        ACCEPT_LANGUAGE,
        "ja,en-US;q=0.8,en;q=0.7,zh-TW;q=0.6,zh;q=0.5",
    );

    if is_booth_url(trimmed) {
        request = request.header(COOKIE, BOOTH_ADULT_COOKIE);
    }

    request
        .send()
        .and_then(|response| response.error_for_status())
        .map_err(db_error)?
        .text()
        .map(Some)
        .map_err(db_error)
}

fn is_booth_url(url: &str) -> bool {
    reqwest::Url::parse(url)
        .ok()
        .and_then(|url| url.host_str().map(ToOwned::to_owned))
        .is_some_and(|host| host == "booth.pm" || host.ends_with(".booth.pm"))
}

fn selector(pattern: &str) -> CommandResult<Selector> {
    Selector::parse(pattern).map_err(db_error)
}

fn meta_content(document: &Html, pattern: &str) -> CommandResult<Option<String>> {
    let selector = selector(pattern)?;

    Ok(document.select(&selector).find_map(|element| {
        element
            .value()
            .attr("content")
            .map(str::trim)
            .filter(|content| !content.is_empty())
            .map(ToOwned::to_owned)
    }))
}

fn element_text(document: &Html, pattern: &str) -> CommandResult<Option<String>> {
    let selector = selector(pattern)?;

    Ok(document
        .select(&selector)
        .find_map(|element| clean_text(&element.text().collect::<Vec<_>>().join(" "))))
}

fn clean_text(value: &str) -> Option<String> {
    let cleaned = value.split_whitespace().collect::<Vec<_>>().join(" ");
    (!cleaned.is_empty()).then_some(cleaned)
}

fn json_ld_products(document: &Html) -> Vec<Value> {
    let Ok(selector) = selector(r#"script[type="application/ld+json"]"#) else {
        return Vec::new();
    };
    let mut products = Vec::new();

    for element in document.select(&selector) {
        let json = element.text().collect::<Vec<_>>().join("");
        if let Ok(value) = serde_json::from_str::<Value>(&json) {
            collect_json_ld_products(&value, &mut products);
        }
    }

    products
}

fn collect_json_ld_products(value: &Value, products: &mut Vec<Value>) {
    match value {
        Value::Array(items) => {
            for item in items {
                collect_json_ld_products(item, products);
            }
        }
        Value::Object(object) => {
            if json_ld_type_is_product(object.get("@type")) {
                products.push(value.clone());
            }
            if let Some(graph) = object.get("@graph") {
                collect_json_ld_products(graph, products);
            }
        }
        _ => {}
    }
}

fn json_ld_type_is_product(value: Option<&Value>) -> bool {
    match value {
        Some(Value::String(type_name)) => type_name.eq_ignore_ascii_case("product"),
        Some(Value::Array(type_names)) => type_names.iter().any(|type_name| {
            type_name
                .as_str()
                .is_some_and(|name| name.eq_ignore_ascii_case("product"))
        }),
        _ => false,
    }
}

fn product_json_string(products: &[Value], key: &str) -> Option<String> {
    products.iter().find_map(|product| {
        product
            .get(key)
            .and_then(Value::as_str)
            .and_then(clean_text)
    })
}

fn product_json_image(products: &[Value]) -> Option<String> {
    products
        .iter()
        .find_map(|product| match product.get("image") {
            Some(Value::String(image)) => clean_text(image),
            Some(Value::Array(images)) => {
                images.iter().find_map(Value::as_str).and_then(clean_text)
            }
            _ => None,
        })
}

fn product_json_brand(products: &[Value]) -> Option<String> {
    products.iter().find_map(|product| {
        product
            .get("brand")
            .and_then(|brand| brand.get("name"))
            .and_then(Value::as_str)
            .and_then(clean_text)
    })
}

fn product_title(document: &Html, products: &[Value]) -> CommandResult<Option<String>> {
    if let Some(title) = product_json_string(products, "name") {
        return Ok(Some(title));
    }

    if let Some(title) = meta_content(
        document,
        r#"meta[property="og:title"], meta[name="og:title"]"#,
    )? {
        return Ok(Some(title));
    }

    element_text(document, "title")
}

fn product_thumbnail_url(document: &Html, products: &[Value]) -> CommandResult<Option<String>> {
    if let Some(image) = product_json_image(products) {
        return Ok(Some(image));
    }

    meta_content(
        document,
        r#"meta[property="og:image"], meta[name="og:image"]"#,
    )
}

fn product_description(document: &Html, products: &[Value]) -> CommandResult<Option<String>> {
    let json_description = product_json_string(products, "description");
    let meta_description = meta_content(
        document,
        r#"meta[property="og:description"], meta[name="description"]"#,
    )?;
    let body_description = product_body_description(document)?;

    Ok(longest_text([
        json_description,
        meta_description,
        body_description,
    ]))
}

fn product_body_description(document: &Html) -> CommandResult<Option<String>> {
    let selector =
        selector(".js-market-item-detail-description, .main-info-column section.shop__text")?;
    let chunks = document
        .select(&selector)
        .filter_map(|element| clean_text(&element.text().collect::<Vec<_>>().join(" ")))
        .collect::<Vec<_>>();

    Ok(clean_text(&chunks.join(" ")).filter(|description| description.chars().count() >= 40))
}

fn longest_text<const N: usize>(values: [Option<String>; N]) -> Option<String> {
    values
        .into_iter()
        .flatten()
        .max_by_key(|value| value.chars().count())
}

fn product_tags(document: &Html, search_text: &str) -> CommandResult<Vec<String>> {
    let tag_selector = selector(concat!(
        "a[href*='/items?tags%5B%5D='], ",
        "a[href*='/items?tags[]='], ",
        "a[href*='/search/'], ",
        "[class*='tag'] a"
    ))?;
    let image_selector = selector("img")?;
    let mut tags = BTreeSet::new();

    for element in document.select(&tag_selector) {
        let link_text = clean_text(&element.text().collect::<Vec<_>>().join(" ")).or_else(|| {
            element
                .select(&image_selector)
                .find_map(|image| image.value().attr("alt").and_then(clean_text))
        });

        if let Some(tag) = link_text {
            let tag = tag.trim_start_matches('#').trim();
            if is_useful_tag(tag) {
                tags.insert(tag.to_string());
            }
        }
    }

    for element in document.select(&selector("[data-shop-tracking-product-category]")?) {
        if let Some(tag) = element
            .value()
            .attr("data-shop-tracking-product-category")
            .and_then(clean_text)
            .filter(|tag| is_useful_tag(tag))
        {
            tags.insert(tag);
        }
    }

    let inference_text = format!(
        "{} {}",
        search_text,
        tags.iter()
            .map(String::as_str)
            .collect::<Vec<_>>()
            .join(" ")
    );

    for tag in inferred_product_tags(&inference_text) {
        tags.insert(tag);
    }

    Ok(tags.into_iter().collect())
}

fn product_variation_names(document: &Html) -> CommandResult<Vec<String>> {
    let selector = selector(".variation-name")?;
    let mut names = BTreeSet::new();

    for element in document.select(&selector) {
        if let Some(name) = clean_text(&element.text().collect::<Vec<_>>().join(" ")) {
            names.insert(name);
        }
    }

    Ok(names.into_iter().collect())
}

fn inferred_product_tags(search_text: &str) -> Vec<String> {
    let text = search_text.to_lowercase();
    let mut tags = BTreeSet::new();

    if contains_any(&text, &["vrchat", "vrc", "avatar", "アバター"]) {
        tags.insert("VRChat".to_string());
    }
    if contains_any(
        &text,
        &[
            "costume",
            "outfit",
            "lingerie",
            "clothing",
            "コスチューム",
            "衣装",
            "服",
        ],
    ) {
        tags.insert("衣装".to_string());
    }
    if contains_any(
        &text,
        &["texture", "tex", "material", "テクスチャ", "マテリアル"],
    ) {
        tags.insert("テクスチャ".to_string());
    }
    if contains_any(&text, &["shader", "liltoon", "シェーダー"]) {
        tags.insert("シェーダー".to_string());
    }
    if contains_any(&text, &["hair", "髪"]) {
        tags.insert("髪型".to_string());
    }
    if contains_any(&text, &["accessory", "accessories", "アクセサリー", "装飾"]) {
        tags.insert("アクセサリー".to_string());
    }
    if contains_any(&text, &["world", "ワールド"]) {
        tags.insert("ワールド".to_string());
    }

    tags.into_iter().collect()
}

fn contains_any(text: &str, needles: &[&str]) -> bool {
    needles.iter().any(|needle| text.contains(needle))
}

fn is_useful_tag(tag: &str) -> bool {
    let normalized = tag.trim();
    !normalized.is_empty()
        && normalized.chars().count() <= 40
        && normalized
            .chars()
            .any(|character| !character.is_ascii_digit())
        && !normalized.contains('\n')
        && !matches!(
            normalized.to_ascii_lowercase().as_str(),
            "booth" | "pixiv" | "share" | "tweet"
        )
}

fn product_search_text(
    title: Option<&str>,
    description: Option<&str>,
    brand: Option<&str>,
    tags: &[String],
    variation_names: &[String],
) -> String {
    let mut values = Vec::new();
    if let Some(title) = title {
        values.push(title);
    }
    if let Some(description) = description {
        values.push(description);
    }
    if let Some(brand) = brand {
        values.push(brand);
    }
    values.extend(tags.iter().map(String::as_str));
    values.extend(variation_names.iter().map(String::as_str));
    values.join(" ")
}

fn parse_product_info(html: &str) -> CommandResult<BoothProductInfo> {
    let document = Html::parse_document(html);
    let products = json_ld_products(&document);
    let title = product_title(&document, &products)?;
    let thumbnail_url = product_thumbnail_url(&document, &products)?;
    let description = product_description(&document, &products)?;
    let brand = product_json_brand(&products);
    let variation_names = product_variation_names(&document)?;
    let base_search_text = product_search_text(
        title.as_deref(),
        description.as_deref(),
        brand.as_deref(),
        &[],
        &variation_names,
    );
    let tags = product_tags(&document, &base_search_text)?;
    let search_text = product_search_text(
        title.as_deref(),
        description.as_deref(),
        brand.as_deref(),
        &tags,
        &variation_names,
    );

    Ok(BoothProductInfo {
        title,
        thumbnail_url,
        tags,
        search_text,
    })
}

pub fn fetch_thumbnail_url(url: &str) -> CommandResult<Option<String>> {
    let Some(html) = fetch_booth_html(url)? else {
        return Ok(None);
    };
    let document = Html::parse_document(&html);
    let products = json_ld_products(&document);

    product_thumbnail_url(&document, &products)
}

#[tauri::command]
pub fn fetch_booth_thumbnail(url: String) -> CommandResult<Option<String>> {
    fetch_thumbnail_url(&url)
}

#[tauri::command]
pub fn fetch_booth_product_info(url: String) -> CommandResult<Option<BoothProductInfo>> {
    let Some(html) = fetch_booth_html(&url)? else {
        return Ok(None);
    };

    parse_product_info(&html).map(Some)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognizes_booth_hosts() {
        assert!(is_booth_url("https://booth.pm/ja/items/6600044"));
        assert!(is_booth_url("https://neonmaru.booth.pm/items/6600044"));
        assert!(!is_booth_url("https://example.com/items/6600044"));
    }

    #[test]
    fn parses_product_info_from_meta_and_tag_links() {
        let html = r#"
          <html>
            <head>
              <meta property="og:title" content="Ribbon Set for Kikyo" />
              <meta property="og:image" content="https://example.com/thumb.jpg" />
              <meta name="description" content="対応モデル: 桔梗 / Kikyo" />
            </head>
            <body>
              <a href="/ja/items?tags%5B%5D=Hair">#Hair</a>
              <a href="/ja/items?tags%5B%5D=Accessory">Accessory</a>
            </body>
          </html>
        "#;

        let info = parse_product_info(html).expect("parse product info");

        assert_eq!(info.title.as_deref(), Some("Ribbon Set for Kikyo"));
        assert_eq!(
            info.thumbnail_url.as_deref(),
            Some("https://example.com/thumb.jpg")
        );
        assert!(info.tags.contains(&"Accessory".to_string()));
        assert!(info.tags.contains(&"Hair".to_string()));
        assert!(info.tags.contains(&"アクセサリー".to_string()));
        assert!(info.tags.contains(&"髪型".to_string()));
        assert!(info.search_text.contains("Kikyo"));
    }

    #[test]
    fn parses_booth_json_ld_description_and_variations() {
        let html = r#"
          <html>
            <head>
              <meta property="og:title" content="Cyberpunk Body - BOOTH" />
              <meta property="og:image" content="https://example.com/meta.jpg" />
              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "Product",
                  "name": "Cyberpunk-Body Tex+Material",
                  "description": "Avatar Tex. Sio: https://example.com/sio Manuka: https://example.com/manuka Shinra: https://example.com/shinra",
                  "image": "https://example.com/json.jpg",
                  "brand": { "@type": "Brand", "name": "No.39" }
                }
              </script>
            </head>
            <body>
              <a href="https://booth.pm/ja/items?tags%5B%5D=VRChat">
                <img alt="VRChat" src="badge.png" />
              </a>
              <div class="variation-name">Airi Cyberpunk Body</div>
              <div class="variation-name">Milltina Cyberpunk Body</div>
            </body>
          </html>
        "#;

        let info = parse_product_info(html).expect("parse product info");

        assert_eq!(info.title.as_deref(), Some("Cyberpunk-Body Tex+Material"));
        assert_eq!(
            info.thumbnail_url.as_deref(),
            Some("https://example.com/json.jpg")
        );
        assert!(info.tags.contains(&"VRChat".to_string()));
        assert!(info.tags.contains(&"テクスチャ".to_string()));
        assert!(info.search_text.contains("Sio"));
        assert!(info.search_text.contains("Airi Cyberpunk Body"));
    }

    #[test]
    fn infers_tags_from_age_gate_meta_description() {
        let html = r#"
          <html>
            <head>
              <meta property="og:title" content="Valentine Lingerie - BOOTH" />
              <meta property="og:description" content="24-Avatars Costume ▸Milltina ▸Shinano ▸Manuka ▸Sio ▸Kikyo" />
              <meta property="og:image" content="https://example.com/lingerie.jpg" />
            </head>
            <body><h1>年齢確認</h1></body>
          </html>
        "#;

        let info = parse_product_info(html).expect("parse product info");

        assert!(info.tags.contains(&"VRChat".to_string()));
        assert!(info.tags.contains(&"衣装".to_string()));
        assert!(info.search_text.contains("Shinano"));
        assert!(info.search_text.contains("Kikyo"));
    }

    #[test]
    fn uses_booth_body_description_and_tracking_category() {
        let html = r#"
          <html>
            <head>
              <meta property="og:title" content="Valentine Lingerie - BOOTH" />
              <meta property="og:description" content="24-Avatars Costume ▸Milltina ▸Shinano" />
              <meta property="og:image" content="https://example.com/lingerie.jpg" />
            </head>
            <body>
              <div data-shop-tracking-product-category="3D Clothing"></div>
              <div class="js-market-item-detail-description description">
                <p>
                  24-Avatars Costume.
                  ▸Milltina ▸Shinano ▸Manuka ▸Kikyo ▸Lasyusha ▸Milfy
                  Modular Avatar setup with liltoon shader.
                </p>
              </div>
              <div class="variation-name">しなの - Shinano</div>
            </body>
          </html>
        "#;

        let info = parse_product_info(html).expect("parse product info");

        assert!(info.tags.contains(&"3D Clothing".to_string()));
        assert!(info.tags.contains(&"衣装".to_string()));
        assert!(info.search_text.contains("Lasyusha"));
        assert!(info.search_text.contains("しなの - Shinano"));
    }
}
