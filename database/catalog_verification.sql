-- Read-only verification queries to run after schema + taxonomy are applied.

select 'retailers' as entity, count(*) as rows from public.retailers
union all select 'products', count(*) from public.products
union all select 'variants', count(*) from public.product_variants
union all select 'offers', count(*) from public.retailer_offers
union all select 'images', count(*) from public.product_images
union all select 'categories', count(*) from public.categories
union all select 'styles', count(*) from public.styles
union all select 'materials', count(*) from public.materials
union all select 'colours', count(*) from public.colours;

select
  p.id,
  p.name,
  p.curation_score,
  count(distinct v.id) as variant_count,
  count(distinct o.id) filter (where o.is_active) as active_offer_count,
  count(distinct i.id) as image_count
from public.products p
left join public.product_variants v on v.product_id = p.id
left join public.retailer_offers o on o.variant_id = v.id
left join public.product_images i on i.product_id = p.id
group by p.id
order by p.curation_score desc, p.name;

select
  q.severity,
  q.issue_code,
  count(*) as open_issues
from public.catalog_quality_issues q
where q.resolved_at is null
group by q.severity, q.issue_code
order by q.severity, q.issue_code;
