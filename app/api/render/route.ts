import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth";
import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import type { ProductSelection } from "@/lib/catalog/selection";
import { getCatalogDb } from "@/lib/catalog/neon";
import { calculateImageCost, snapshotGbpCost, IMAGE_COST_BASIS } from "@/lib/render/cost";
import {
  ensureRenderWallet,
  refundFailedGeneration,
  spendCreditAndCreateGeneration,
} from "@/lib/render/credits-server";
import { getLiveSelectionCandidates } from '@/lib/catalog/repository';
import { applySelectionChoices, approvalSnapshot, buildProductSelection } from '@/lib/catalog/selection';
import { MAX_CORRECTIONS, validPlacements, type Placement } from '@/lib/render/pilot';
import { getVerifiedRenderProducts } from "@/lib/render/products";
import {
  buildRoomRenderPrompt,
  RENDER_PROMPT_VERSION,
} from "@/lib/render/prompt";

export const runtime = "nodejs";
export const maxDuration = 180;

type RenderRequest = {
  ownerKey?: string;
  designId?: string;
  requestId?: string;
  intake?: IntakeForBrief;
  brief?: DesignBrief;
  selection?: ProductSelection;
  placements?: Placement[];
  parentGenerationId?: string;
  correction?: string;
};

type ImageMetadata = { format: "jpeg" | "png" | "webp"; width: number; height: number; orientation: number };

function readTiffOrientation(bytes: Uint8Array, start: number, end: number): number {
  if (start + 8 > end) return 1;
  const little = bytes[start] === 0x49 && bytes[start + 1] === 0x49;
  const big = bytes[start] === 0x4d && bytes[start + 1] === 0x4d;
  if (!little && !big) return 1;
  const read16 = (offset: number) => little
    ? bytes[offset] + bytes[offset + 1] * 256
    : bytes[offset] * 256 + bytes[offset + 1];
  const read32 = (offset: number) => little
    ? bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65536 + bytes[offset + 3] * 16777216
    : bytes[offset] * 16777216 + bytes[offset + 1] * 65536 + bytes[offset + 2] * 256 + bytes[offset + 3];
  const directory = start + read32(start + 4);
  if (directory + 2 > end) return 1;
  const entries = read16(directory);
  for (let index = 0; index < entries; index += 1) {
    const entry = directory + 2 + index * 12;
    if (entry + 12 > end) break;
    if (read16(entry) === 0x0112 && read16(entry + 2) === 3 && read32(entry + 4) >= 1) {
      const orientation = read16(entry + 8);
      return orientation >= 1 && orientation <= 8 ? orientation : 1;
    }
  }
  return 1;
}

function readImageMetadata(bytes: Uint8Array): ImageMetadata {
  const ascii = (offset: number, length: number) => {
    let value = "";
    for (let index = 0; index < length; index += 1) value += String.fromCharCode(bytes[offset + index] || 0);
    return value;
  };
  const read16be = (offset: number) => bytes[offset] * 256 + bytes[offset + 1];
  const read32be = (offset: number) => bytes[offset] * 16777216 + bytes[offset + 1] * 65536 + bytes[offset + 2] * 256 + bytes[offset + 3];
  const read24le = (offset: number) => bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65536;
  const read32le = (offset: number) => bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65536 + bytes[offset + 3] * 16777216;

  if (bytes.length >= 24 && ascii(0, 8) === "\x89PNG\r\n\x1a\n") {
    const width = read32be(16);
    const height = read32be(20);
    let orientation = 1;
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const chunkLength = read32be(offset);
      const chunkType = ascii(offset + 4, 4);
      const dataStart = offset + 8;
      const dataEnd = dataStart + chunkLength;
      if (dataEnd + 4 > bytes.length) break;
      if (chunkType === "eXIf") orientation = readTiffOrientation(bytes, dataStart, dataEnd);
      if (chunkType === "IEND") break;
      offset = dataEnd + 4;
    }
    if (width && height) return { format: "png", width, height, orientation };
  }

  if (bytes.length >= 4 && ascii(0, 2) === "\xff\xd8") {
    const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let width = 0;
    let height = 0;
    let orientation = 1;
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const segmentLength = read16be(offset);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
      const dataStart = offset + 2;
      const dataEnd = offset + segmentLength;
      if (marker === 0xe1 && ascii(dataStart, 6) === "Exif\x00\x00") {
        orientation = readTiffOrientation(bytes, dataStart + 6, dataEnd);
      }
      if (sofMarkers.has(marker) && dataStart + 5 <= dataEnd) {
        height = read16be(dataStart + 1);
        width = read16be(dataStart + 3);
      }
      offset += segmentLength;
    }
    if (width && height) return { format: "jpeg", width, height, orientation };
  }

  if (bytes.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    let width = 0;
    let height = 0;
    let orientation = 1;
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const chunkType = ascii(offset, 4);
      const chunkLength = read32le(offset + 4);
      const dataStart = offset + 8;
      const dataEnd = dataStart + chunkLength;
      if (dataEnd > bytes.length) break;
      if (chunkType === "VP8X" && chunkLength >= 10) {
        width = 1 + read24le(dataStart + 4);
        height = 1 + read24le(dataStart + 7);
      } else if (chunkType === "VP8L" && chunkLength >= 5 && bytes[dataStart] === 0x2f) {
        const b1 = bytes[dataStart + 1], b2 = bytes[dataStart + 2], b3 = bytes[dataStart + 3], b4 = bytes[dataStart + 4];
        width = 1 + (((b2 & 0x3f) << 8) | b1);
        height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      } else if (chunkType === "VP8 " && chunkLength >= 10 && bytes[dataStart + 3] === 0x9d && bytes[dataStart + 4] === 0x01 && bytes[dataStart + 5] === 0x2a) {
        width = (bytes[dataStart + 6] | (bytes[dataStart + 7] << 8)) & 0x3fff;
        height = (bytes[dataStart + 8] | (bytes[dataStart + 9] << 8)) & 0x3fff;
      } else if (chunkType === "EXIF") {
        const prefix = ascii(dataStart, 6) === "Exif\x00\x00" ? 6 : 0;
        orientation = readTiffOrientation(bytes, dataStart + prefix, dataEnd);
      }
      if (width && height) return { format: "webp", width, height, orientation };
      offset = dataEnd + (chunkLength % 2);
    }
  }

  throw new Error("The uploaded or generated image has an unsupported or unreadable file header.");
}

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    input_tokens_details?: {
      text_tokens?: number;
      image_tokens?: number;
    };
    output_tokens_details?: {
      image_tokens?: number;
      text_tokens?: number;
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
};

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validOwnerKey(value: string) {
  return /^[a-zA-Z0-9_-]{20,100}$/.test(value);
}

async function getRoomAsset(designId: string, ownerKey: string) {
  const sql = getCatalogDb();
  const rows = await sql.query(
    `select
      d.id::text as design_id,
      a.id::text as asset_id,
      a.mime_type,
      a.external_url,
      case when a.data is null then null else encode(a.data,'base64') end as base64
     from public.room_designs d
     join public.design_assets a on a.id = d.original_room_asset_id
     where d.id=$1::uuid
       and d.owner_key=$2
       and a.asset_kind='room_original'
     limit 1`,
    [designId, ownerKey],
  ) as Array<{
    design_id: string;
    asset_id: string;
    mime_type: string;
    external_url: string | null;
    base64: string | null;
  }>;

  const asset = rows[0];
  if (!asset) return null;

  const imageUrl = asset.external_url
    ? asset.external_url
    : asset.base64
      ? `data:${asset.mime_type};base64,${asset.base64}`
      : null;

  return imageUrl ? { ...asset, imageUrl } : null;
}

async function persistApprovedState(
  designId: string,
  ownerKey: string,
  intake: IntakeForBrief,
  brief: DesignBrief,
  selection: ProductSelection,
) {
  const sql = getCatalogDb();
  const rows = await sql.query(
    `update public.room_designs
     set
       intake=$3::jsonb,
       brief=$4::jsonb,
       product_selection=$5::jsonb,
       approved_brief_at=coalesce(approved_brief_at, now()),
       approved_products_at=now(),
       status='render_ready',
       updated_at=now()
     where id=$1::uuid and owner_key=$2
     returning id::text as id`,
    [
      designId,
      ownerKey,
      JSON.stringify(intake),
      JSON.stringify(brief),
      JSON.stringify(selection),
    ],
  ) as Array<{ id: string }>;

  return Boolean(rows[0]);
}

async function existingGeneration(generationId: string) {
  const sql = getCatalogDb();
  const rows = await sql.query(
    `select
      status,
      result_asset_id::text as result_asset_id,
      failure_message,
      cost_usd_micros,
      duration_ms
     from public.render_generations
     where id=$1::uuid
     limit 1`,
    [generationId],
  ) as Array<{
    status: string;
    result_asset_id: string | null;
    failure_message: string | null;
    cost_usd_micros: number | null;
    duration_ms: number | null;
  }>;
  return rows[0] ?? null;
}

export async function POST(request: Request) {
  let body: RenderRequest;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid render request.' }, { status: 400 }); }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid render request.' }, { status: 400 });
  if (body.intake?.roomType === 'bedroom') return NextResponse.json({ error: 'Bedroom image generation is not available yet. Your brief remains saved.' }, { status: 409 });
  const account = await getCurrentAccount();
  const ownerKey = account?.ownerKey || body.ownerKey || "";
  const designId = body.designId || "";
  const requestId = body.requestId || "";

  if (
    !validOwnerKey(ownerKey)
    || !validUuid(designId)
    || !validUuid(requestId)
    || !body.intake
    || !body.brief
    || !body.selection
  ) {
    return NextResponse.json({ error: "The approved room design is incomplete." }, { status: 400 });
  }

  if (!Array.isArray(body.selection.products)) {
    return NextResponse.json({ error: "The room design choices are incomplete." }, { status: 400 });
  }

  if (body.selection.products.length === 0) {
    return NextResponse.json({ error: "Choose and approve at least one reviewed retailer product before creating a room visual.", code: "PRODUCT_SELECTION_REQUIRED" }, { status: 409 });
  }

  if (body.selection.products.length > 6) {
    return NextResponse.json({ error: "The first living-room pilot is limited to six product references." }, { status: 409 });
  }

  if (!validPlacements(body.placements, body.selection)) return NextResponse.json({ error: 'Confirm an intended placement for every selected variant.' }, { status: 400 });
  if (body.parentGenerationId && (!validUuid(body.parentGenerationId) || typeof body.correction !== 'string' || body.correction.trim().length < 10 || body.correction.length > 2000)) return NextResponse.json({ error: 'Identify the failed result and describe the correction (10–2,000 characters).' }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Image generation is not configured yet." }, { status: 503 });
  }

  let generationId: string | null = null;
  let correctionAttempt = 0;
  let previousResultUrl: string | null = null;
  const startedAt = Date.now();
  let providerRequestId: string | null = null;
  let measuredUsage = calculateImageCost(null);
  let gbpCost = snapshotGbpCost(null);

  try {
    const candidates = await getLiveSelectionCandidates();
    const refreshed = applySelectionChoices(buildProductSelection(body.intake, body.brief, candidates), body.selection.products.map(item => ({ slot: item.slot, variantId: item.selected.variantId, quantity: item.quantity })));
    if (!refreshed.products.length) return NextResponse.json({ error: 'No reviewed retailer products match this room. Adjust your choices before creating a room visual.', code: 'PRODUCT_SELECTION_REQUIRED' }, { status: 409 });
    if (approvalSnapshot(refreshed) !== approvalSnapshot(body.selection)) return NextResponse.json({ error: 'The approved collection has changed. Review the products again before generating.', code: 'SELECTION_CHANGED' }, { status: 409 });
    body.selection = refreshed;
    const roomAsset = await getRoomAsset(designId, ownerKey);
    if (!roomAsset) {
      return NextResponse.json({
        error: "The original room photograph is missing. Upload it again before rendering.",
      }, { status: 409 });
    }

    if (!roomAsset.base64) return NextResponse.json({ error: 'Upload the actual room photograph for the pilot rather than using an example-room link.' }, { status: 409 });
    const imageMetadata = readImageMetadata(Buffer.from(roomAsset.base64, 'base64'));
    const rotated = (imageMetadata.orientation || 1) >= 5;
    const sourceWidth = (rotated ? imageMetadata.height : imageMetadata.width) || 0;
    const sourceHeight = (rotated ? imageMetadata.width : imageMetadata.height) || 0;
    if (!sourceWidth || !sourceHeight || sourceWidth / sourceHeight > 3 || sourceHeight / sourceWidth > 3) return NextResponse.json({ error: 'Use a room photograph with an aspect ratio between 1:3 and 3:1.' }, { status: 400 });
    const scale = 1536 / Math.max(sourceWidth, sourceHeight);
    const outputSize = `${Math.round(sourceWidth * scale / 16) * 16}x${Math.round(sourceHeight * scale / 16) * 16}`;
    const products = await getVerifiedRenderProducts(body.selection);
    if (body.parentGenerationId) {
      const priorRows = await getCatalogDb().query(`select g.metadata,a.mime_type,encode(a.data,'base64') as base64 from public.render_generations g join public.design_assets a on a.id=g.result_asset_id where g.id=$1::uuid and g.design_id=$2::uuid and g.status='succeeded' and g.prompt_version=$3`, [body.parentGenerationId, designId, RENDER_PROMPT_VERSION]) as any[];
      const prior = priorRows[0];
      if (!prior?.base64 || prior.metadata?.humanReview?.outcome !== 'needs_correction') return NextResponse.json({ error: 'Save a review identifying the failed or uncertain checks before requesting a correction.' }, { status: 409 });
      correctionAttempt = Number(prior.metadata.correctionAttempt || 0) + 1;
      if (correctionAttempt > MAX_CORRECTIONS) return NextResponse.json({ error: 'Two corrections have been attempted. Stop for manual review before spending more credits.' }, { status: 409 });
      if (JSON.stringify(prior.metadata.snapshot) !== JSON.stringify({ intake: body.intake, brief: body.brief, selection: body.selection, placements: body.placements, roomAssetId: roomAsset.asset_id })) {
        // createdAt is regenerated during catalogue checks; compare substantive inputs instead.
        const snapshot = prior.metadata.snapshot;
        if (!snapshot || snapshot.roomAssetId !== roomAsset.asset_id || approvalSnapshot(snapshot.selection) !== approvalSnapshot(body.selection) || JSON.stringify([snapshot.intake, snapshot.brief, snapshot.placements]) !== JSON.stringify([body.intake, body.brief, body.placements])) return NextResponse.json({ error: 'The room, brief, products or placements changed. Return to the brief and start a new approved design.' }, { status: 409 });
      }
      previousResultUrl = `data:${prior.mime_type};base64,${prior.base64}`;
    }
    const persisted = await persistApprovedState(
      designId,
      ownerKey,
      body.intake,
      body.brief,
      body.selection,
    );
    if (!persisted) {
      return NextResponse.json({ error: "Design not found." }, { status: 404 });
    }

    const wallet = await ensureRenderWallet(ownerKey);
    if (wallet.verifiedRequired) {
      return NextResponse.json({
        error: "A verified account is required before render credits can be used.",
        code: "VERIFIED_ACCOUNT_REQUIRED",
        balance: wallet.balance,
      }, { status: 403 });
    }

    if (wallet.balance < 1 && !wallet.siteCreditExempt) {
      return NextResponse.json({
        error: "You have used your free image. Buy 10 more image credits for £2 from your account page.",
        code: "NO_RENDER_CREDIT",
        balance: wallet.balance,
      }, { status: 402 });
    }

    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst-2026-09-08";
    const quality = process.env.OPENAI_IMAGE_QUALITY || "high";
    const prompt = buildRoomRenderPrompt(body.intake, body.brief, body.selection, products, body.placements!, body.parentGenerationId ? body.correction : undefined);
    if (body.parentGenerationId) {
      const claimed = await getCatalogDb().query(`update public.render_generations set metadata=metadata || jsonb_build_object('correctionRequestId',$2::text) where id=$1::uuid and design_id=$3::uuid and metadata->'humanReview'->>'outcome'='needs_correction' and (metadata->>'correctionRequestId' is null or metadata->>'correctionRequestId'=$2) returning id`, [body.parentGenerationId, requestId, designId]) as any[];
      if (!claimed.length) return NextResponse.json({ error: 'A correction has already been requested for this result. Reload the saved pilot history before continuing.' }, { status: 409 });
    }

    const spend = await spendCreditAndCreateGeneration({
      ownerKey,
      designId,
      requestId,
      model,
      promptVersion: RENDER_PROMPT_VERSION,
      promptText: prompt,
      productIds: products.map((product) => product.productId),
      quality,
      outputSize,
      metadata: { snapshot: { intake: body.intake, brief: body.brief, selection: body.selection, placements: body.placements, roomAssetId: roomAsset.asset_id }, products, correctionAttempt, parentGenerationId: body.parentGenerationId || null, correction: body.correction || null, costBasis: IMAGE_COST_BASIS, humanReview: null },
    });

    generationId = spend.generation_id;

    if (spend.reused) {
      const prior = await existingGeneration(generationId);
      if (prior?.status === "succeeded" && prior.result_asset_id) {
        return NextResponse.json({
          generationId,
          resultAssetId: prior.result_asset_id,
          resultUrl: account ? `/api/assets/${prior.result_asset_id}` : `/api/assets/${prior.result_asset_id}?ownerKey=${encodeURIComponent(ownerKey)}`,
          balance: spend.balance,
          reused: true,
          costUsdMicros: prior.cost_usd_micros,
          durationMs: prior.duration_ms,
        });
      }

      return NextResponse.json({
        error: prior?.status === "processing"
          ? "This render request is already processing."
          : "This render attempt has already finished. Start a new render request.",
        code: "DUPLICATE_RENDER_REQUEST",
        generationId,
        balance: spend.balance,
      }, { status: 409 });
    }

    const images = [
      { image_url: roomAsset.imageUrl },
      ...(previousResultUrl ? [{ image_url: previousResultUrl }] : []),
    ];

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(
        Math.max(10_000, Math.min(170_000, Number(process.env.OPENAI_IMAGE_TIMEOUT_MS || 150_000))),
      ),
      body: JSON.stringify({
        model,
        images,
        prompt,
        n: 1,
        quality,
        size: outputSize,
        output_format: "jpeg",
        output_compression: 88,
        background: "opaque",
        moderation: "auto",
      }),
    });

    providerRequestId = response.headers.get("x-request-id");
    const payload = await response.json() as OpenAIImageResponse;
    measuredUsage = calculateImageCost(payload.usage, model);
    gbpCost = snapshotGbpCost(measuredUsage.costUsdMicros);

    if (!response.ok) {
      throw new Error(payload.error?.message || `OpenAI image edit failed with HTTP ${response.status}.`);
    }

    const resultBase64 = payload.data?.[0]?.b64_json;
    if (!resultBase64) {
      throw new Error("OpenAI returned no rendered image.");
    }

    const bytes = Buffer.from(resultBase64, "base64");
    const resultMetadata = readImageMetadata(bytes);
    if (resultMetadata.format !== "jpeg" || !resultMetadata.width || !resultMetadata.height) throw new Error("Provider returned an invalid image file.");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const durationMs = Date.now() - startedAt;
    const sql = getCatalogDb();

    const saved = await sql.query(
      `with asset as (
        insert into public.design_assets (
          design_id, asset_kind, mime_type, byte_size, data, sha256,
          storage_backend, metadata
        )
        values (
          $1::uuid, 'render_result', 'image/jpeg', $2, decode($3,'base64'), $4,
          'postgres_bytea_mvp',
          jsonb_build_object('generation_id',$5::uuid,'provider','openai')
        )
        returning id
      ),
      generation as (
        update public.render_generations g
        set
          status='succeeded',
          result_asset_id=a.id,
          provider_request_id=$6,
          input_text_tokens=$7,
          input_image_tokens=$8,
          output_image_tokens=$9,
          total_tokens=$10,
          cost_usd_micros=$11,
          cost_gbp_minor=$12,
          cost_fx_usd_gbp=$13,
          duration_ms=$14,
          completed_at=now()
        from asset a
        where g.id=$5::uuid
        returning a.id
      ),
      design as (
        update public.room_designs
        set status='rendered', updated_at=now()
        where id=$1::uuid
        returning id
      )
      select id::text as asset_id from generation`,
      [
        designId,
        bytes.length,
        resultBase64,
        sha256,
        generationId,
        providerRequestId,
        measuredUsage.inputTextTokens,
        measuredUsage.inputImageTokens,
        measuredUsage.outputImageTokens,
        measuredUsage.totalTokens,
        measuredUsage.costUsdMicros,
        gbpCost.costGbpMinor,
        gbpCost.usdToGbpRate,
        durationMs,
      ],
    ) as Array<{ asset_id: string }>;

    const resultAssetId = saved[0]?.asset_id;
    if (!resultAssetId) {
      throw new Error("The rendered image could not be persisted.");
    }

    return NextResponse.json({
      generationId,
      resultAssetId,
      resultUrl: account ? `/api/assets/${resultAssetId}` : `/api/assets/${resultAssetId}?ownerKey=${encodeURIComponent(ownerKey)}`,
      balance: spend.balance,
      renderCreditsUsed: 1,
      provider: "openai",
      model,
      promptVersion: RENDER_PROMPT_VERSION,
      costUsdMicros: measuredUsage.costUsdMicros,
      costGbpMinor: gbpCost.costGbpMinor,
      costFxUsdGbp: gbpCost.usdToGbpRate,
      durationMs,
      correctionAttempt,
      costBasis: IMAGE_COST_BASIS,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const reason = error instanceof Error ? error.message : "Render failed.";
    const timedOut = error instanceof Error
      && (error.name === "TimeoutError" || error.name === "AbortError");
    gbpCost = snapshotGbpCost(measuredUsage.costUsdMicros);

    let refunded = false;
    if (generationId) {
      try {
        await refundFailedGeneration({
          generationId,
          reason,
          failureCode: timedOut ? "PROVIDER_TIMEOUT" : "RENDER_FAILED",
          durationMs,
          providerRequestId,
          usage: measuredUsage,
          costGbpMinor: gbpCost.costGbpMinor,
          costFxUsdGbp: gbpCost.usdToGbpRate,
        });
        refunded = true;
      } catch (refundError) {
        console.error("Render refund logging failed", refundError);
      }
    }

    console.error("Room render failed", error);
    return NextResponse.json({
      error: generationId ? (refunded ? "The render failed and the design credit has been returned." : "The render failed. Credit return could not be confirmed; check your balance before retrying.") : reason,
      code: generationId && !refunded ? "REFUND_UNCONFIRMED" : generationId
        ? (timedOut ? "RENDER_TIMEOUT_REFUNDED" : "RENDER_FAILED_REFUNDED")
        : (timedOut ? "RENDER_TIMEOUT" : "RENDER_FAILED"),
      generationId,
    }, { status: 500 });
  }
}
