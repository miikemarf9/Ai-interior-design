import { NextResponse } from 'next/server';
import { buildFallbackBrief, type DesignBrief, type IntakeForBrief } from '@/lib/brief';

export const runtime = 'nodejs';

type BriefRequest = {
  intake?: IntakeForBrief;
  currentBrief?: DesignBrief;
  request?: string;
};

function extractOutputText(payload: any): string {
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item?.content)) continue;
    for (const content of item.content) {
      if (content?.type === 'output_text' && typeof content?.text === 'string') return content.text;
    }
  }
  return '';
}

function parseBrief(text: string): DesignBrief | null {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    const keys = ['title','direction','keep','change','palette','materials','function','avoid','measurements','creativeFreedom','budget','designerNote'];
    if (keys.every((key) => typeof parsed?.[key] === 'string')) return parsed as DesignBrief;
  } catch {
    // Fall through to deterministic draft.
  }
  return null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as BriefRequest;
  if (!body.intake) return NextResponse.json({ error: 'Missing intake.' }, { status: 400 });

  const fallback = buildFallbackBrief(body.intake);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    if (body.request?.trim() && body.currentBrief) {
      return NextResponse.json({
        source: 'preview',
        brief: {
          ...body.currentBrief,
          designerNote: `${body.currentBrief.designerNote} Customer refinement to apply: ${body.request.trim()}`,
        },
      });
    }
    return NextResponse.json({ source: 'preview', brief: fallback });
  }

  const task = body.request?.trim()
    ? `Revise the existing design brief to incorporate this customer request: "${body.request.trim()}". Preserve every confirmed constraint that the request does not explicitly change. Existing brief: ${JSON.stringify(body.currentBrief || fallback)}`
    : 'Create the first written design brief from the customer intake.';

  const prompt = `You are the interior-design brief engine for a UK consumer interior-design and commerce service.

The customer has completed a detailed pre-design consultation. Turn it into a concise, professional interior designer's proposal that is useful for later product selection and room-image generation.

Rules:
- Use British English.
- Be specific but restrained.
- Do not invent exact products, retailers, measurements, colours, materials, or constraints that the customer did not provide.
- Do not promise that furniture will fit.
- Preserve existing-room items the customer wants to keep.
- Treat the budget as a whole-room product budget.
- Respect practical needs such as children, pets, TV viewing, storage or working.
- The output is still free exploration. Do not mention credits except where the supplied data explicitly requires it.
- Output ONLY one valid JSON object and no markdown.

Required JSON keys:
"title", "direction", "keep", "change", "palette", "materials", "function", "avoid", "measurements", "creativeFreedom", "budget", "designerNote".

Customer intake:
${JSON.stringify(body.intake)}

Task:
${task}`;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_BRIEF_MODEL || 'gpt-6-luna',
        input: prompt,
        max_output_tokens: 1400,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ source: 'preview', brief: fallback, warning: 'AI brief service unavailable.' });
    }

    const data = await response.json();
    const parsed = parseBrief(extractOutputText(data));
    return NextResponse.json({ source: parsed ? 'ai' : 'preview', brief: parsed || fallback });
  } catch {
    return NextResponse.json({ source: 'preview', brief: fallback, warning: 'AI brief service unavailable.' });
  }
}
