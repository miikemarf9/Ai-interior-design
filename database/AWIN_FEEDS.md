# Awin feed handoff

Roomfound uses authorized affiliate product feeds for production catalogue data rather than scraping retailer product pages.

## Why Awin first

The feed format gives us the commercial fields Stage 6 and Stage 9 both need:

- retailer product ID
- product name and description
- retailer URL
- Awin tracking/deep link
- current price and previous/RRP price where supplied
- product image URL
- brand
- colour
- dimensions/specifications where supplied
- stock / availability
- delivery fields
- EAN / MPN / parent product ID where supplied

## First retailer sources

### Wayfair UK

- Awin advertiser ID: `72067`
- Very broad home catalogue
- Excellent long-term source for product breadth
- Programme acceptance is more selective, so do not make launch dependent on approval here alone

### The Range

- Awin advertiser ID: `5238`
- Furniture, lighting and decor coverage
- Broad affiliate policy makes this a useful first application alongside Wayfair

## Awin setup

1. Create / use an Awin publisher account for the Roomfound website.
2. Apply to the retailer programme.
3. Once feed access is available, open Awin Classic → Toolbox → Create-a-Feed.
4. Choose English / UK.
5. Select only the advertiser and living-room/home categories needed for the catalogue.
6. Select the useful feed columns, ideally including:
   - `aw_deep_link`
   - `merchant_deep_link`
   - `product_name`
   - `aw_product_id`
   - `merchant_product_id`
   - `merchant_image_url`
   - `large_image`
   - `alternate_image`
   - `description`
   - `product_short_description`
   - `merchant_category`
   - `merchant_product_category_path`
   - `search_price`
   - `store_price`
   - `rrp_price`
   - `product_price_old`
   - `currency`
   - `brand_name`
   - `colour`
   - `dimensions`
   - `specifications`
   - `last_updated`
   - `in_stock`
   - `stock_quantity`
   - `stock_status`
   - `pre_order`
   - `delivery_restrictions`
   - `delivery_time`
   - `ean`
   - `mpn`
   - `parent_product_id`
7. Generate CSV with comma delimiter and no compression for the first integration.
8. Put the generated URL into the matching server environment variable. Never commit it.

## Environment mapping

Wayfair UK:

```
AWIN_FEED_URL_WAYFAIR_UK=<secret Create-a-Feed URL>
```

The Range:

```
AWIN_FEED_URL_THE_RANGE=<secret Create-a-Feed URL>
```

## Import behaviour

The protected endpoint:

```
POST /api/catalog/import/awin
Authorization: Bearer <CATALOG_IMPORT_SECRET>
Content-Type: application/json

{"retailerSlug":"the-range"}
```

does not publish products.

It:

1. scans the authorized feed;
2. normalizes product data;
3. filters to Roomfound living-room categories;
4. rejects weak rows without an image, current GBP price or orderable availability;
5. infers preliminary style/material/colour tags;
6. parses dimensions where the feed supplies them;
7. quality-scores the row;
8. stages the strongest candidates in `catalog_feed_candidates`.

Promotion is separate:

```
POST /api/catalog/curate/promote
Authorization: Bearer <CATALOG_IMPORT_SECRET>
Content-Type: application/json

{"candidateIds":["<reviewed candidate uuid>"]}
```

Promotion creates or matches the canonical product and variant, attaches the retailer offer, stores the product image, adds taxonomy links and appends the current commercial state to price history.

## Rule

A huge feed is a source, not the catalogue.

Roomfound should still launch with a deliberately curated subset rather than hundreds of thousands of automatically published products.
