import { getCatalogDb } from "@/lib/catalog/neon";
import type { ProductSelection } from "@/lib/catalog/selection";
import type { IntakeForBrief } from "@/lib/brief";
import type {
  ProductVerification,
  RoomVerification,
  VerificationStatus,
} from "@/lib/verification/types";

export const VERIFICATION_VERSION = "verified-room-v1";
const PRICE_VERIFIED_HOURS = 72;
const PRICE_STALE_HOURS = 168;

type DesignRow = {
  design_id: string;
  generation_id: string;
  intake: IntakeForBrief | null;
  selection: ProductSelection;
  result_mime_type: string | null;
  result_base64: string | null;
};

type CatalogueEvidence = {
  position: number;
  slot: string;
  product_id: string;
  variant_id: string;
  selected_offer_id: string | null;
  product_name: string;
  variant_name: string | null;
  product_status: string;
  is_curated: boolean;
  variant_status: string;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  image_url: string | null;
  live_offer_id: string | null;
  retailer_name: string | null;
  price_minor: number | null;
  availability: string | null;
  uk_delivery_status: string | null;
  price_checked_at: string | null;
};

type VisualAssessment = {
  position: number;
  confidence: number | null;
  status: VerificationStatus;
  note: string;
};

function numericCm(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function roomMeasurements(intake: IntakeForBrief | null) {
  const widthCm = numericCm(intake?.measurements?.width);
  const lengthCm = numericCm(intake?.measurements?.length);
  const heightCm = numericCm(intake?.measurements?.height);
  return {
    widthMm: widthCm ? Math.round(widthCm * 10) : null,
    lengthMm: lengthCm ? Math.round(lengthCm * 10) : null,
    heightMm: heightCm ? Math.round(heightCm * 10) : null,
  };
}

function roomMeasurementAssessment(intake: IntakeForBrief | null) {
  const room = roomMeasurements(intake);
  if (room.widthMm && room.lengthMm) {
    return {
      status: "verified" as const,
      note: room.heightMm
        ? "Room width, length and ceiling height were supplied."
        : "Room width and length were supplied. Ceiling height is not required for the V1 floor-space check.",
      ...room,
    };
  }

  if (room.widthMm || room.lengthMm) {
    return {
      status: "warning" as const,
      note: "Only one horizontal room measurement was supplied, so product fit cannot be checked reliably.",
      ...room,
    };
  }

  return {
    status: "insufficient" as const,
    note: "Room width and length were not supplied. Product dimensions can be shown, but fit is not verified.",
    ...room,
  };
}

function ageHours(value: string | null) {
  if (!value) return null;
  const age = Date.now() - new Date(value).getTime();
  return Number.isFinite(age) ? Math.max(0, age / 3_600_000) : null;
}

function priceAssessment(row: CatalogueEvidence) {
  if (row.price_minor === null || row.price_minor < 0) {
    return {
      status: "insufficient" as VerificationStatus,
      note: "No current GBP price is available.",
    };
  }

  const age = ageHours(row.price_checked_at);
  if (age === null) {
    return {
      status: "insufficient" as VerificationStatus,
      note: "A price exists, but its last-check time is unavailable.",
    };
  }
  if (age <= PRICE_VERIFIED_HOURS) {
    return {
      status: "verified" as VerificationStatus,
      note: `Price checked ${humanAge(age)} ago.`,
    };
  }
  if (age <= PRICE_STALE_HOURS) {
    return {
      status: "warning" as VerificationStatus,
      note: `Price was last checked ${humanAge(age)} ago and should be refreshed before purchase.`,
    };
  }
  return {
    status: "failed" as VerificationStatus,
    note: `Price data is stale: last checked ${humanAge(age)} ago.`,
  };
}

function humanAge(hours: number) {
  if (hours < 1) return "less than an hour";
  if (hours < 24) return `${Math.round(hours)} hours`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function availabilityAssessment(row: CatalogueEvidence) {
  if (!row.live_offer_id) {
    return {
      status: "failed" as VerificationStatus,
      note: "No currently orderable UK retailer offer was found for this exact variant.",
    };
  }

  if (
    ["in_stock", "low_stock"].includes(row.availability || "")
    && row.uk_delivery_status === "available"
  ) {
    return {
      status: "verified" as VerificationStatus,
      note: `Currently ${row.availability === "low_stock" ? "low stock" : "in stock"} with UK delivery at ${row.retailer_name}.`,
    };
  }

  if (
    ["preorder", "backorder", "in_stock", "low_stock"].includes(row.availability || "")
    && ["available", "restricted"].includes(row.uk_delivery_status || "")
  ) {
    return {
      status: "warning" as VerificationStatus,
      note: row.uk_delivery_status === "restricted"
        ? `Orderable at ${row.retailer_name}, but UK delivery has restrictions.`
        : `Orderable at ${row.retailer_name} as ${(row.availability || "").replaceAll("_", " ")} rather than normal in-stock availability.`,
    };
  }

  if (row.availability === "unknown" || row.uk_delivery_status === "unknown") {
    return {
      status: "insufficient" as VerificationStatus,
      note: "Retailer availability or UK delivery status is currently unknown.",
    };
  }

  return {
    status: "failed" as VerificationStatus,
    note: "The current retailer data does not show this exact variant as orderable for UK delivery.",
  };
}

function dimensionsAssessment(row: CatalogueEvidence) {
  const dimensions = [row.width_mm, row.height_mm, row.depth_mm];
  const known = dimensions.filter((value) => typeof value === "number" && value > 0).length;
  if (known === 3) {
    return {
      status: "verified" as VerificationStatus,
      note: `${Math.round((row.width_mm || 0) / 10)} W × ${Math.round((row.depth_mm || 0) / 10)} D × ${Math.round((row.height_mm || 0) / 10)} H cm supplied for the selected variant.`,
    };
  }
  if (known > 0) {
    return {
      status: "warning" as VerificationStatus,
      note: "Some dimensions are supplied, but width, depth and height are not all available.",
    };
  }
  return {
    status: "insufficient" as VerificationStatus,
    note: "Retailer/product data does not currently include usable dimensions.",
  };
}

function roomFitAssessment(
  row: CatalogueEvidence,
  room: ReturnType<typeof roomMeasurementAssessment>,
) {
  if (!room.widthMm || !room.lengthMm) {
    return {
      status: "insufficient" as VerificationStatus,
      note: "Fit was not checked because room width and length are incomplete.",
    };
  }
  if (!row.width_mm || !row.depth_mm) {
    return {
      status: "insufficient" as VerificationStatus,
      note: "Fit was not checked because this product is missing width or depth.",
    };
  }

  const shortest = Math.min(room.widthMm, room.lengthMm);
  const longest = Math.max(room.widthMm, room.lengthMm);
  if (row.width_mm > longest || row.depth_mm > shortest) {
    return {
      status: "failed" as VerificationStatus,
      note: "The product exceeds the supplied room envelope on at least one axis.",
    };
  }

  return {
    status: "verified" as VerificationStatus,
    note: "The product fits inside the supplied room envelope. V1 does not yet verify placement clearances, doors or circulation space.",
  };
}

function realProductAssessment(row: CatalogueEvidence) {
  if (
    row.product_status === "active"
    && row.variant_status === "active"
    && row.is_curated
    && row.image_url
  ) {
    return {
      status: "verified" as VerificationStatus,
      note: "Matched to an active curated catalogue product, exact variant and reference image.",
    };
  }

  if (row.product_status === "active" && row.variant_status === "active") {
    return {
      status: "warning" as VerificationStatus,
      note: "The product record exists, but its curated/reference-image evidence is incomplete.",
    };
  }

  return {
    status: "failed" as VerificationStatus,
    note: "The selected product or variant is no longer active in the catalogue.",
  };
}

function extractOutputText(payload: any) {
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    if (item?.type !== "message" || !Array.isArray(item?.content)) continue;
    for (const content of item.content) {
      if (content?.type === "output_text" && typeof content?.text === "string") {
        return content.text;
      }
    }
  }
  return "";
}

function parseVisualAssessments(text: string, count: number): VisualAssessment[] {
  const cleaned = text.replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { items?: unknown[] };
    if (!Array.isArray(parsed.items)) return [];

    return parsed.items.flatMap((item: any) => {
      const position = Number(item?.position);
      if (!Number.isInteger(position) || position < 0 || position >= count) return [];
      const confidenceRaw = Number(item?.confidence);
      const confidence = Number.isFinite(confidenceRaw)
        ? Math.max(0, Math.min(100, Math.round(confidenceRaw)))
        : null;
      const note = typeof item?.note === "string" && item.note.trim()
        ? item.note.trim().slice(0, 500)
        : "Visual comparison returned no explanation.";

      let status: VerificationStatus = "insufficient";
      if (confidence !== null) {
        status = confidence >= 85 ? "verified" : confidence >= 60 ? "warning" : "failed";
      }

      return [{ position, confidence, status, note }];
    });
  } catch {
    return [];
  }
}

async function visualAssessment(args: {
  renderMimeType: string | null;
  renderBase64: string | null;
  evidence: CatalogueEvidence[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !args.renderBase64 || !args.renderMimeType) {
    return {
      provider: null,
      model: null,
      providerRequestId: null,
      durationMs: null,
      items: [] as VisualAssessment[],
    };
  }

  const comparable = args.evidence.filter((row) => row.image_url);
  if (!comparable.length) {
    return {
      provider: null,
      model: null,
      providerRequestId: null,
      durationMs: null,
      items: [] as VisualAssessment[],
    };
  }

  const model = process.env.OPENAI_VERIFICATION_MODEL || "gpt-5.6";
  const content: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: `You are the visual verification layer for a UK interior-design commerce product.

IMAGE 0 is the final generated room. The following images are the exact reference-product images, each labelled with its product position.

For each product reference, judge ONLY whether the visible item in the generated room appears materially consistent with that reference in overall form, major silhouette, material/finish family and colour family.

Important:
- This is a confidence assessment, not proof of pixel-perfect identity.
- Do not infer exact dimensions, structural safety, clearances, doorway fit or physical scale from the image.
- Penalise obvious divergence in shape, colour, upholstery/material or missing products.
- Occlusion, distance, lighting and perspective reduce confidence and should be stated as uncertainty.
- Never claim certainty when the product cannot be seen clearly.
- Output ONLY valid JSON with this shape:
{"items":[{"position":0,"confidence":0,"note":"short evidence-based note"}]}
- confidence is an integer 0-100.
- Return one item for every supplied reference-product image.`,
    },
    {
      type: "input_text",
      text: "IMAGE 0 — FINAL GENERATED ROOM",
    },
    {
      type: "input_image",
      image_url: `data:${args.renderMimeType};base64,${args.renderBase64}`,
      detail: "high",
    },
  ];

  for (const row of comparable) {
    content.push({
      type: "input_text",
      text: `REFERENCE PRODUCT — position ${row.position}: ${row.product_name}${row.variant_name ? ` · ${row.variant_name}` : ""}`,
    });
    content.push({
      type: "input_image",
      image_url: row.image_url,
      detail: "high",
    });
  }

  const startedAt = Date.now();
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [{ role: "user", content }],
        max_output_tokens: 1800,
      }),
    });

    const providerRequestId = response.headers.get("x-request-id");
    if (!response.ok) {
      return {
        provider: "openai",
        model,
        providerRequestId,
        durationMs: Date.now() - startedAt,
        items: [] as VisualAssessment[],
      };
    }

    const payload = await response.json();
    return {
      provider: "openai",
      model,
      providerRequestId,
      durationMs: Date.now() - startedAt,
      items: parseVisualAssessments(extractOutputText(payload), args.evidence.length),
    };
  } catch {
    return {
      provider: "openai",
      model,
      providerRequestId: null,
      durationMs: Date.now() - startedAt,
      items: [] as VisualAssessment[],
    };
  }
}

function aggregateStatus(products: ProductVerification[]): VerificationStatus {
  const statuses = products.flatMap((product) => [
    product.realProductStatus,
    product.ukAvailabilityStatus,
    product.priceStatus,
    product.dimensionsStatus,
    product.roomFitStatus,
    product.visualStatus,
  ]);

  if (statuses.includes("failed") || statuses.includes("warning")) return "warning";
  if (statuses.includes("insufficient")) return "insufficient";
  return "verified";
}

export async function buildVerifiedRoom(args: {
  designId: string;
  generationId: string;
}): Promise<RoomVerification> {
  const sql = getCatalogDb();

  const rows = await sql.query(
    `select
      d.id::text as design_id,
      d.intake,
      d.product_selection as selection,
      g.id::text as generation_id,
      a.mime_type as result_mime_type,
      case when a.data is null then null else encode(a.data,'base64') end as result_base64
    from public.room_designs d
    join public.render_generations g
      on g.id=$2::uuid
      and g.design_id=d.id
      and g.status='succeeded'
      and g.result_asset_id is not null
    join public.design_assets a on a.id=g.result_asset_id
    where d.id=$1::uuid
    limit 1`,
    [args.designId, args.generationId],
  ) as DesignRow[];

  const design = rows[0];
  if (!design?.selection?.products?.length) {
    throw new Error("Verification requires a completed room with selected products.");
  }

  const requested = design.selection.products.map((item, position) => ({
    position,
    slot: item.slot,
    product_id: item.selected.productId,
    variant_id: item.selected.variantId,
    offer_id: item.selected.offer.id,
  }));

  const evidence = await sql.query(
    `with requested as (
      select *
      from jsonb_to_recordset($1::jsonb) as x(
        position integer,
        slot text,
        product_id uuid,
        variant_id uuid,
        offer_id uuid
      )
    )
    select
      req.position,
      req.slot,
      p.id::text as product_id,
      v.id::text as variant_id,
      req.offer_id::text as selected_offer_id,
      p.name as product_name,
      v.name as variant_name,
      p.status::text as product_status,
      p.is_curated,
      v.status::text as variant_status,
      v.width_mm,
      v.height_mm,
      v.depth_mm,
      pi.image_url,
      offer.id::text as live_offer_id,
      offer.retailer_name,
      offer.price_minor,
      offer.availability,
      offer.uk_delivery_status,
      offer.price_checked_at
    from requested req
    join public.products p on p.id=req.product_id
    join public.product_variants v on v.id=req.variant_id and v.product_id=p.id
    left join lateral (
      select image_url
      from public.product_images
      where product_id=p.id
        and (variant_id is null or variant_id=v.id)
        and image_url is not null
      order by is_primary desc,(variant_id=v.id) desc,sort_order asc
      limit 1
    ) pi on true
    left join lateral (
      select
        ro.id,
        r.name as retailer_name,
        ro.price_minor,
        ro.availability::text as availability,
        ro.uk_delivery_status::text as uk_delivery_status,
        coalesce(ro.last_price_checked_at,ro.last_checked_at) as price_checked_at
      from public.retailer_offers ro
      join public.retailers r on r.id=ro.retailer_id
      where ro.variant_id=v.id
        and ro.is_active
        and ro.currency='GBP'
        and r.status='active'
        and r.ships_to_uk
      order by
        (ro.id=req.offer_id) desc,
        (ro.availability in ('in_stock','low_stock')) desc,
        (ro.uk_delivery_status='available') desc,
        ro.last_checked_at desc
      limit 1
    ) offer on true
    order by req.position`,
    [JSON.stringify(requested)],
  ) as CatalogueEvidence[];

  const room = roomMeasurementAssessment(design.intake);

  const existingVisual = await sql.query(
    `select
      rp.position,
      rp.visual_status,
      rp.visual_confidence,
      rp.visual_note,
      rv.visual_provider,
      rv.visual_model,
      rv.provider_request_id,
      rv.duration_ms
    from public.room_verifications rv
    join public.room_product_verifications rp on rp.verification_id=rv.id
    where rv.generation_id=$1::uuid
      and rv.verification_version=$2
      and rv.status in ('complete','partial')
    order by rp.position`,
    [args.generationId, VERIFICATION_VERSION],
  ) as Array<{
    position:number;
    visual_status:VerificationStatus;
    visual_confidence:number|null;
    visual_note:string|null;
    visual_provider:string|null;
    visual_model:string|null;
    provider_request_id:string|null;
    duration_ms:number|null;
  }>;

  const hasVisualEvidence = existingVisual.some((item) => item.visual_confidence !== null);
  const visual = hasVisualEvidence
    ? {
        provider: existingVisual[0]?.visual_provider ?? null,
        model: existingVisual[0]?.visual_model ?? null,
        providerRequestId: existingVisual[0]?.provider_request_id ?? null,
        durationMs: existingVisual[0]?.duration_ms ?? null,
        items: existingVisual.map((item) => ({
          position:item.position,
          confidence:item.visual_confidence,
          status:item.visual_status,
          note:item.visual_note || "Visual comparison did not return a note.",
        })),
      }
    : await visualAssessment({
        renderMimeType: design.result_mime_type,
        renderBase64: design.result_base64,
        evidence,
      });

  const visualByPosition = new Map(visual.items.map((item) => [item.position,item]));

  const products: ProductVerification[] = evidence.map((row) => {
    const real = realProductAssessment(row);
    const availability = availabilityAssessment(row);
    const price = priceAssessment(row);
    const dimensions = dimensionsAssessment(row);
    const fit = roomFitAssessment(row, room);
    const visualItem = visualByPosition.get(row.position);

    return {
      position: row.position,
      slot: row.slot,
      productId: row.product_id,
      variantId: row.variant_id,
      offerId: row.live_offer_id,
      productName: row.product_name,
      variantName: row.variant_name,
      retailerName: row.retailer_name,
      priceMinor: row.price_minor,
      realProductStatus: real.status,
      realProductNote: real.note,
      ukAvailabilityStatus: availability.status,
      ukAvailabilityNote: availability.note,
      priceStatus: price.status,
      priceNote: price.note,
      priceCheckedAt: row.price_checked_at,
      dimensionsStatus: dimensions.status,
      dimensionsNote: dimensions.note,
      roomFitStatus: fit.status,
      roomFitNote: fit.note,
      visualStatus: visualItem?.status ?? "insufficient",
      visualConfidence: visualItem?.confidence ?? null,
      visualNote: visualItem?.note
        ?? (row.image_url
          ? "Visual comparison is unavailable right now. No match is being assumed."
          : "No reference image is available for visual comparison."),
      widthMm: row.width_mm,
      heightMm: row.height_mm,
      depthMm: row.depth_mm,
    };
  });

  const overallStatus = aggregateStatus(products);
  const verificationRows = await sql.query(
    `insert into public.room_verifications (
      design_id,generation_id,verification_version,status,overall_status,
      room_measurement_status,room_width_mm,room_length_mm,room_height_mm,
      visual_provider,visual_model,provider_request_id,duration_ms,summary,completed_at
    )
    values (
      $1::uuid,$2::uuid,$3,'complete',$4,$5,$6,$7,$8,
      $9,$10,$11,$12,$13::jsonb,now()
    )
    on conflict (generation_id,verification_version)
    do update set
      status='complete',
      overall_status=excluded.overall_status,
      room_measurement_status=excluded.room_measurement_status,
      room_width_mm=excluded.room_width_mm,
      room_length_mm=excluded.room_length_mm,
      room_height_mm=excluded.room_height_mm,
      visual_provider=coalesce(excluded.visual_provider,public.room_verifications.visual_provider),
      visual_model=coalesce(excluded.visual_model,public.room_verifications.visual_model),
      provider_request_id=coalesce(excluded.provider_request_id,public.room_verifications.provider_request_id),
      duration_ms=coalesce(excluded.duration_ms,public.room_verifications.duration_ms),
      summary=excluded.summary,
      error_message=null,
      completed_at=now()
    returning id::text as id,completed_at::text as completed_at`,
    [
      args.designId,
      args.generationId,
      VERIFICATION_VERSION,
      overallStatus,
      room.status,
      room.widthMm,
      room.lengthMm,
      room.heightMm,
      visual.provider,
      visual.model,
      visual.providerRequestId,
      visual.durationMs,
      JSON.stringify({
        priceVerifiedHours: PRICE_VERIFIED_HOURS,
        priceStaleHours: PRICE_STALE_HOURS,
        roomMeasurementNote: room.note,
        limitations: [
          "Room-envelope checking is not a full layout or clearance calculation.",
          "Doorways, circulation clearances and wall-space placement are not verified in V1.",
          "Visual match is an AI confidence assessment, not proof of exact photographic identity.",
          "Retailer price and availability can change after the recorded check time.",
        ],
      }),
    ],
  ) as Array<{id:string;completed_at:string}>;

  const verificationId = verificationRows[0].id;

  await sql.query(
    `delete from public.room_product_verifications where verification_id=$1::uuid`,
    [verificationId],
  );

  for (const product of products) {
    await sql.query(
      `insert into public.room_product_verifications (
        verification_id,position,slot,product_id,variant_id,offer_id,
        real_product_status,uk_availability_status,price_status,dimensions_status,
        room_fit_status,visual_status,visual_confidence,visual_note,
        retailer_name,price_minor,price_checked_at,availability,uk_delivery_status,
        width_mm,height_mm,depth_mm,evidence
      )
      values (
        $1::uuid,$2,$3,$4::uuid,$5::uuid,$6::uuid,
        $7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        $18,$19,$20,$21,$22,$23::jsonb
      )`,
      [
        verificationId,
        product.position,
        product.slot,
        product.productId,
        product.variantId,
        product.offerId,
        product.realProductStatus,
        product.ukAvailabilityStatus,
        product.priceStatus,
        product.dimensionsStatus,
        product.roomFitStatus,
        product.visualStatus,
        product.visualConfidence,
        product.visualNote,
        product.retailerName,
        product.priceMinor,
        product.priceCheckedAt,
        evidence[product.position]?.availability ?? null,
        evidence[product.position]?.uk_delivery_status ?? null,
        product.widthMm,
        product.heightMm,
        product.depthMm,
        JSON.stringify({
          realProductNote:product.realProductNote,
          ukAvailabilityNote:product.ukAvailabilityNote,
          priceNote:product.priceNote,
          dimensionsNote:product.dimensionsNote,
          roomFitNote:product.roomFitNote,
        }),
      ],
    );
  }

  return {
    id: verificationId,
    designId: args.designId,
    generationId: args.generationId,
    version: VERIFICATION_VERSION,
    overallStatus,
    roomMeasurementStatus: room.status,
    roomMeasurementNote: room.note,
    checkedAt: verificationRows[0].completed_at,
    visualModel: visual.model,
    visualProvider: visual.provider,
    products,
    limitations: [
      "Room-envelope checking is not a full layout or clearance calculation.",
      "Doorways, circulation clearances and wall-space placement are not verified in V1.",
      "Visual match is an AI confidence assessment, not proof of exact photographic identity.",
      "Retailer price and availability can change after the recorded check time.",
    ],
  };
}

export async function readStoredVerification(generationId: string): Promise<RoomVerification | null> {
  const sql = getCatalogDb();
  const rows = await sql.query(
    `select
      rv.id::text as id,
      rv.design_id::text as design_id,
      rv.generation_id::text as generation_id,
      rv.verification_version,
      rv.overall_status,
      rv.room_measurement_status,
      rv.visual_provider,
      rv.visual_model,
      rv.completed_at::text as checked_at,
      rv.summary,
      jsonb_agg(
        jsonb_build_object(
          'position',rp.position,
          'slot',rp.slot,
          'productId',rp.product_id::text,
          'variantId',rp.variant_id::text,
          'offerId',rp.offer_id::text,
          'productName',p.name,
          'variantName',v.name,
          'retailerName',rp.retailer_name,
          'priceMinor',rp.price_minor,
          'realProductStatus',rp.real_product_status,
          'realProductNote',rp.evidence->>'realProductNote',
          'ukAvailabilityStatus',rp.uk_availability_status,
          'ukAvailabilityNote',rp.evidence->>'ukAvailabilityNote',
          'priceStatus',rp.price_status,
          'priceNote',rp.evidence->>'priceNote',
          'priceCheckedAt',rp.price_checked_at,
          'dimensionsStatus',rp.dimensions_status,
          'dimensionsNote',rp.evidence->>'dimensionsNote',
          'roomFitStatus',rp.room_fit_status,
          'roomFitNote',rp.evidence->>'roomFitNote',
          'visualStatus',rp.visual_status,
          'visualConfidence',rp.visual_confidence,
          'visualNote',rp.visual_note,
          'widthMm',rp.width_mm,
          'heightMm',rp.height_mm,
          'depthMm',rp.depth_mm
        )
        order by rp.position
      ) as products
    from public.room_verifications rv
    join public.room_product_verifications rp on rp.verification_id=rv.id
    join public.products p on p.id=rp.product_id
    join public.product_variants v on v.id=rp.variant_id
    where rv.generation_id=$1::uuid
      and rv.verification_version=$2
      and rv.status in ('complete','partial')
    group by rv.id
    limit 1`,
    [generationId,VERIFICATION_VERSION],
  ) as Array<any>;

  const row=rows[0];
  if(!row) return null;

  return {
    id:row.id,
    designId:row.design_id,
    generationId:row.generation_id,
    version:row.verification_version,
    overallStatus:row.overall_status,
    roomMeasurementStatus:row.room_measurement_status,
    roomMeasurementNote:row.summary?.roomMeasurementNote || "Room measurement evidence unavailable.",
    checkedAt:row.checked_at,
    visualModel:row.visual_model,
    visualProvider:row.visual_provider,
    products:row.products || [],
    limitations:Array.isArray(row.summary?.limitations) ? row.summary.limitations : [],
  };
}
