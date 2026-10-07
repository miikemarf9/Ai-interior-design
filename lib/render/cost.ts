type ImageUsage = {
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

export type RenderUsage = {
  inputTextTokens: number | null;
  inputImageTokens: number | null;
  outputImageTokens: number | null;
  totalTokens: number | null;
  costUsdMicros: number | null;
};

export function calculateImageCost(usage?: ImageUsage | null): RenderUsage {
  if (!usage) {
    return {
      inputTextTokens: null,
      inputImageTokens: null,
      outputImageTokens: null,
      totalTokens: null,
      costUsdMicros: null,
    };
  }

  const inputTextTokens = usage.input_tokens_details?.text_tokens ?? null;
  const inputImageTokens = usage.input_tokens_details?.image_tokens ?? null;
  const outputImageTokens = usage.output_tokens_details?.image_tokens ?? usage.output_tokens ?? null;

  // GPT Image 2.5 standard processing as of 2026-10:
  // text input $5/M, image input $8/M, image output $30/M.
  // With a micro-USD field, token_count * $/M is numerically equal to micro-USD.
  const costUsdMicros =
    inputTextTokens !== null && inputImageTokens !== null && outputImageTokens !== null
      ? (inputTextTokens * 5) + (inputImageTokens * 8) + (outputImageTokens * 30)
      : null;

  return {
    inputTextTokens,
    inputImageTokens,
    outputImageTokens,
    totalTokens: usage.total_tokens ?? null,
    costUsdMicros,
  };
}


export type GbpCostSnapshot = {
  costGbpMinor: number | null;
  usdToGbpRate: number | null;
};

export function snapshotGbpCost(costUsdMicros: number | null): GbpCostSnapshot {
  const rate = Number(process.env.AI_COST_USD_TO_GBP_RATE || "");
  if (costUsdMicros === null || !Number.isFinite(rate) || rate <= 0) {
    return { costGbpMinor: null, usdToGbpRate: null };
  }

  // micro-USD -> USD -> GBP -> pence.
  return {
    costGbpMinor: Math.max(0, Math.round(costUsdMicros * rate / 10_000)),
    usdToGbpRate: rate,
  };
}
