use super::merge_booth_shop_field;

#[test]
fn booth_shop_backfill_treats_blank_existing_fields_as_missing() {
    assert_eq!(
        merge_booth_shop_field(Some(String::new()), Some("ねこまる商店".to_string())),
        Some("ねこまる商店".to_string()),
    );
    assert_eq!(
        merge_booth_shop_field(
            Some("   ".to_string()),
            Some("https://nekomaru.booth.pm".to_string())
        ),
        Some("https://nekomaru.booth.pm".to_string()),
    );
}

#[test]
fn booth_shop_backfill_keeps_existing_non_blank_fields() {
    assert_eq!(
        merge_booth_shop_field(
            Some("Existing Shop".to_string()),
            Some("Fetched Shop".to_string())
        ),
        Some("Existing Shop".to_string()),
    );
}
