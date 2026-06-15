use super::*;

fn parse_product_info(html: &str) -> CommandResult<BoothProductInfo> {
    parse_product_info_with_url(html, None)
}

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
                  "brand": { "@type": "Brand", "name": "No.39", "url": "https://no39.booth.pm" }
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
    assert_eq!(info.shop_name.as_deref(), Some("No.39"));
    assert_eq!(info.shop_url.as_deref(), Some("https://no39.booth.pm"));
    assert!(info.search_text.contains("Sio"));
    assert!(info.search_text.contains("No.39"));
    assert!(info.search_text.contains("Airi Cyberpunk Body"));
}

#[test]
fn infers_tags_from_age_gate_meta_description() {
    let html = r#"
          <html>
            <head>
              <meta property="og:title" content="Valentine Lingerie - BOOTH" />
              <meta property="og:description" content="R-18 24-Avatars Costume ▸Milltina ▸Shinano ▸Manuka ▸Sio ▸Kikyo" />
              <meta property="og:image" content="https://example.com/lingerie.jpg" />
            </head>
            <body><h1>年齢確認</h1></body>
          </html>
        "#;

    let info = parse_product_info(html).expect("parse product info");

    assert!(info.tags.contains(&"VRChat".to_string()));
    assert!(info.tags.contains(&"衣装".to_string()));
    assert!(info.tags.contains(&"R18".to_string()));
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

#[test]
fn parses_representative_booth_product_fixture() {
    let html = r#"
          <html>
            <head>
              <meta property="og:title" content="Layered Outfit for Shinano and Manuka - BOOTH" />
              <meta property="og:image" content="https://img.example.com/meta.jpg" />
              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@graph": [
                    {
                      "@type": "Product",
                      "name": "Layered Outfit + Body Texture Pack",
                      "description": "VRChat avatar costume. 対応: しなのちゃん / 桔梗ちゃん / まぬか / 森羅ちゃん / Sio. Includes makeup texture, prop ribbon, and liltoon material.",
                      "image": ["https://img.example.com/json.jpg"],
                      "brand": {
                        "@type": "Brand",
                        "name": "星屑工房",
                        "url": "//stardust-workshop.booth.pm"
                      }
                    }
                  ]
                }
              </script>
            </head>
            <body>
              <a class="shop-name" href="https://stardust-workshop.booth.pm">星屑工房</a>
              <a href="/ja/items?tags%5B%5D=3D%20Clothing">3D Clothing</a>
              <a href="/ja/search/VRChat">VRChat</a>
              <div data-shop-tracking-product-category="Avatar Accessories"></div>
              <div class="js-market-item-detail-description">
                <p>
                  Modular Avatar 対応の衣装セットです。
                  Body Texture と Makeup、リボン prop、liltoon shader material を含みます。
                  しなのちゃん、桔梗ちゃん、まぬか、森羅ちゃん、しおちゃん向け。
                </p>
              </div>
              <div class="variation-name">Full Set - Shinano / Manuka</div>
              <div class="variation-name">Kikyo + Shinra + Sio</div>
            </body>
          </html>
        "#;

    let info = parse_product_info_with_url(
        html,
        Some("https://stardust-workshop.booth.pm/items/7654321"),
    )
    .expect("parse representative product info");

    assert_eq!(
        info.title.as_deref(),
        Some("Layered Outfit + Body Texture Pack")
    );
    assert_eq!(
        info.thumbnail_url.as_deref(),
        Some("https://img.example.com/json.jpg")
    );
    assert_eq!(info.shop_name.as_deref(), Some("星屑工房"));
    assert_eq!(
        info.shop_url.as_deref(),
        Some("https://stardust-workshop.booth.pm")
    );
    assert!(info.tags.contains(&"3D Clothing".to_string()));
    assert!(info.tags.contains(&"Avatar Accessories".to_string()));
    assert!(info.tags.contains(&"VRChat".to_string()));
    assert!(info.tags.contains(&"衣装".to_string()));
    assert!(info.tags.contains(&"テクスチャ".to_string()));
    assert!(info.tags.contains(&"アクセサリー".to_string()));
    assert!(!info.tags.contains(&"星屑工房".to_string()));

    for model in ["Shinano", "Manuka", "Kikyo", "Shinra", "Sio"] {
        assert!(
            info.search_text.contains(model),
            "missing model hint in search text: {model}"
        );
    }
    for alias in [
        "しなのちゃん",
        "桔梗ちゃん",
        "まぬか",
        "森羅ちゃん",
        "しおちゃん",
    ] {
        assert!(
            info.search_text.contains(alias),
            "missing Japanese alias in search text: {alias}"
        );
    }
}

#[test]
fn keeps_supported_avatar_names_from_booth_body_and_variations() {
    let html = r#"
          <html>
            <head>
              <meta property="og:title" content="Midnight Reverie - BOOTH" />
              <meta property="og:description" content="Midnight Reverie costume for VRChat avatars." />
            </head>
            <body>
              <div class="js-market-item-detail-description description">
                <p>-</p>
              </div>
              <article>
                <section class="shop__text">
                  <h2>Supported Avatars (対応アバター)</h2>
                  <p>
                    「ミルティナ」 - Milltina
                    「愛莉」- Airi
                    「しなの」- Shinano
                    「マヌカ」- Manuka
                    「 森羅」 - Shinra
                    「セレスティア」- Selestia
                    「海咲」 - Misaki
                    「萌」- Moe
                    「ショコラ」 - Chocolat
                    「シフォン」- Chiffon
                    「Sio」- しお
                    「まよ」- Mayo
                    「イチゴ」- Ichigo
                    「ルミナ」- LUMINA
                    「ひきくまりのクマリ」- Kumaly
                  </p>
                </section>
              </article>
              <div class="variation-name">クマリ - Kumaly</div>
              <div class="variation-name">イチゴ - Ichigo</div>
              <div class="variation-name">海咲 - Misaki</div>
            </body>
          </html>
        "#;

    let info = parse_product_info(html).expect("parse product info");
    let expected_models = [
        "Milltina", "Airi", "Shinano", "Manuka", "Shinra", "Selestia", "Misaki", "Moe", "Chocolat",
        "Chiffon", "Sio", "Mayo", "Ichigo", "LUMINA", "Kumaly",
    ];

    for model in expected_models {
        assert!(
            info.search_text.contains(model),
            "missing supported avatar in search text: {model}"
        );
    }

    assert!(info.search_text.contains("クマリ - Kumaly"));
    assert!(info.search_text.contains("イチゴ - Ichigo"));
    assert!(info.search_text.contains("海咲 - Misaki"));
}

#[test]
fn keeps_supported_avatar_names_from_json_ld_description() {
    let html = r#"
          <html>
            <head>
              <meta property="og:title" content="Somiel 21 avatars - BOOTH" />
              <meta property="og:description" content="Short preview without the avatar list." />
              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "Product",
                  "name": "Somiel 21 avatars",
                  "description": "【대응 아바타/対応アバタ】\n*Manuka https://jingo1016.booth.pm/items/5058077\n*Chiffon https://komado.booth.pm/items/5354471\n*Lime https://komado.booth.pm/items/4876459\n*Shinano https://booth.pm/ko/items/6106863\n*Airi https://kyubihome.booth.pm/items/6082686\n*Chocolat https://komado.booth.pm/items/6405390\n*Milltina https://dolosart.booth.pm/items/6538026\n*Mizuki https://paryi.booth.pm/items/5132797\n*Rurune https://paryi.booth.pm/items/5957830\n*Sio https://chocolaterice.booth.pm/items/5650156\n*Milfy https://mk22.booth.pm/items/6571299\n*Ichigo https://hamini.booth.pm/items/7328789\n*Eku https://septem47.booth.pm/items/7328764\n*Mao https://paryi.booth.pm/items/6846646\n*Lasyusha https://keenooshop.booth.pm/items/4825073\n*Lumina https://extension.booth.pm/items/7502898\n*Ririka https://paryi.booth.pm/items/6373683\n*Rinasciita https://rionesta.booth.pm/items/7475899\n*Ramune https://emolab.booth.pm/items/7699667\n*Plum https://komado.booth.pm/items/7770415\n*Mayo https://chocolaterice.booth.pm/items/8122803"
                }
              </script>
            </head>
            <body>
              <div class="variation-name">✿Full Package✿ [21 Avatars]</div>
              <div class="variation-name">✿Milfy,Eku✿</div>
              <div class="variation-name">✿Mao,Ririka✿</div>
              <section class="shop__text">UPDATE v1.01</section>
            </body>
          </html>
        "#;

    let info = parse_product_info(html).expect("parse product info");
    let expected_models = [
        "Manuka",
        "Chiffon",
        "Lime",
        "Shinano",
        "Airi",
        "Chocolat",
        "Milltina",
        "Mizuki",
        "Rurune",
        "Sio",
        "Milfy",
        "Ichigo",
        "Eku",
        "Mao",
        "Lasyusha",
        "Lumina",
        "Ririka",
        "Rinasciita",
        "Ramune",
        "Plum",
        "Mayo",
    ];

    for model in expected_models {
        assert!(
            info.search_text.contains(model),
            "missing supported avatar in search text: {model}"
        );
    }
}

#[test]
fn does_not_infer_tags_from_shop_or_seller_names() {
    let html = r#"
          <html>
            <head>
              <meta property="og:title" content="Simple Ribbon - BOOTH" />
              <meta property="og:description" content="A simple decorative item." />
              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "Product",
                  "name": "Simple Ribbon",
                  "description": "A simple decorative item.",
                  "brand": { "@type": "Brand", "name": "Hair Accessory World Shop" }
                }
              </script>
            </head>
            <body>
              <a class="shop-name" href="https://hair-accessory-world.booth.pm">Hair Accessory World Shop</a>
            </body>
          </html>
        "#;

    let info = parse_product_info(html).expect("parse product info");

    assert!(info.tags.is_empty());
    assert_eq!(info.shop_name.as_deref(), Some("Hair Accessory World Shop"));
    assert_eq!(
        info.shop_url.as_deref(),
        Some("https://hair-accessory-world.booth.pm")
    );
    assert!(info.search_text.contains("Hair Accessory World Shop"));
}

#[test]
fn falls_back_to_booth_shop_subdomain_url() {
    let html = r#"
          <html>
            <head>
              <meta property="og:title" content="Simple Ribbon - BOOTH" />
              <meta property="og:description" content="A simple decorative item." />
              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "Product",
                  "name": "Simple Ribbon",
                  "brand": { "@type": "Brand", "name": "ねこまる商店" }
                }
              </script>
            </head>
            <body></body>
          </html>
        "#;

    let info = parse_product_info_with_url(html, Some("https://nekomaru.booth.pm/items/12345"))
        .expect("parse product info");

    assert_eq!(info.shop_name.as_deref(), Some("ねこまる商店"));
    assert_eq!(info.shop_url.as_deref(), Some("https://nekomaru.booth.pm"));
}
