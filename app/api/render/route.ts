import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { DesignBrief, IntakeForBrief } from "@/lib/brief";
import type { ProductSelection } from "@/lib/catalog/selection";
import { getCatalogDb } from "@/lib/catalog/neon";
import { calculateImageCost } from "@/lib/render/cost";
import {
  ensureRenderWallet,
  refundFailedGeneration,
  spendCreditAndCreateGeneration,
} from "@/lib/render/credits-server";
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
};

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
  const body = await request.json() as RenderRequest;
  const ownerKey = body.ownerKey || "";
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

  if (!body.selection.products.length) {
    return NextResponse.json({ error: "Approve at least one real product before rendering." }, { status: 409 });
  }

  if (body.selection.products.length > 15) {
    return NextResponse.json({ error: "This render contains too many product references." }, { status: 409 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Image generation is not configured yet." }, { status: 503 });
  }

  let generationId: string | null = null;
  const startedAt = Date.now();
  let providerRequestId: string | null = null;
  let measuredUsage = calculateImageCost(null);

  try {
    const roomAsset = await getRoomAsset(designId, ownerKey);
    if (!roomAsset) {
      return NextResponse.json({
        error: "The original room photograph is missing. Upload it again before rendering.",
      }, { status: 409 });
    }

    const products = await getVerifiedRenderProducts(body.selection);
    if (!products.length) {
      return NextResponse.json({
        error: "The selected products are not currently render-ready.",
      }, { status: 409 });
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

    if (wallet.balance < 1) {
      return NextResponse.json({
        error: "You do not have enough design credits for another render.",
        code: "NO_RENDER_CREDIT",
        balance: wallet.balance,
      }, { status: 402 });
    }

    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst-2026-09-08";
    const quality = process.env.OPENAI_IMAGE_QUALITY || "high";
    const outputSize = "1536x1024";
    const prompt = buildRoomRenderPrompt(body.intake, body.brief, body.selection, products);

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
    });

    generationId = spend.generation_id;

    if (spend.reused) {
      const prior = await existingGeneration(generationId);
      if (prior?.status === "succeeded" && prior.result_asset_id) {
        return NextResponse.json({
          generationId,
          resultAssetId: prior.result_asset_id,
          resultUrl: `/api/assets/${prior.result_asset_id}?ownerKey=${encodeURIComponent(ownerKey)}`,
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
      ...products.map((product) => ({ image_url: product.imageUrl })),
    ];

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
    measuredUsage = calculateImageCost(payload.usage);

    if (!response.ok) {
      throw new Error(payload.error?.message || `OpenAI image edit failed with HTTP ${response.status}.`);
    }

    const resultBase64 = payload.data?.[0]?.b64_json;
    if (!resultBase64) {
      throw new Error("OpenAI returned no rendered image.");
    }

    const bytes = Buffer.from(resultBase64, "base64");
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
          duration_ms=$12,
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
      resultUrl: `/api/assets/${resultAssetId}?ownerKey=${encodeURIComponent(ownerKey)}`,
      balance: spend.balance,
      renderCreditsUsed: 1,
      provider: "openai",
      model,
      promptVersion: RENDER_PROMPT_VERSION,
      costUsdMicros: measuredUsage.costUsdMicros,
      durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const reason = error instanceof Error ? error.message : "Render failed.";

    if (generationId) {
      try {
        await refundFailedGeneration({
          generationId,
          reason,
          failureCode: "RENDER_FAILED",
          durationMs,
          providerRequestId,
          usage: measuredUsage,
        });
      } catch (refundError) {
        console.error("Render refund logging failed", refundError);
      }
    }

    console.error("Room render failed", error);
    return NextResponse.json({
      error: generationId
        ? "The render failed and the design credit has been returned."
        : reason,
      code: generationId ? "RENDER_FAILED_REFUNDED" : "RENDER_FAILED",
      generationId,
    }, { status: 500 });
  }
}
