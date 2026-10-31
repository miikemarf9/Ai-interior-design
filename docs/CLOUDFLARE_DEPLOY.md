# Transform My Room — Cloudflare Workers release

## Current production state

- GitHub repository: `miikemarf9/Ai-interior-design`
- Existing Cloudflare Worker name: `ai-interior-design`
- Customer domain: `https://transformmyroom.com`
- Framework: Cloudflare Workers + OpenNext (full-stack Next.js, not static Pages).
- The live Worker is manually deployed and has no Cloudflare Workers Builds configuration or repository trigger at present.
- Do not create a second Worker or change DNS while reconnecting builds. Keep the existing production Worker and its domain.

## Build source

The Cloudflare deployment files live on `cloudflare-workers-migration`. PR #20 merges current `main` into that branch. The merged source includes the live product-category API, current approved catalogue flow, six style previews, consent-based interest tracking, affiliate click attribution and current AI routes.

The source was built locally with Node.js 22 and `npm run cf:build`. The build completed and included `/api/products/categories` and the render API routes. GitHub Actions passed dependency audit, typecheck and production build for the merged source.

## Cloudflare connection needed

Cloudflare currently reports no build configuration or build triggers for `ai-interior-design`. The account owner must authorize the Cloudflare GitHub App for `miikemarf9/Ai-interior-design` before Cloudflare can build from the repository.

When connecting it:

1. In Cloudflare, choose Workers & Pages and import/connect the existing repository.
2. Approve Cloudflare's GitHub App for this repository.
3. Select the `cloudflare-workers-migration` branch.
4. Reuse the existing Worker name `ai-interior-design`.
5. Use Node.js 22, install with `npm install`, build with `npm run cf:build`, and deploy with `npm run cf:upload`.
6. Keep the existing production domain and DNS attached to the existing Worker.

Do not choose the static Pages preset.

## Runtime variables and secrets

Keep runtime values in Worker environment variables/secrets, never in Git. The existing Worker already has the app URL, database and Awin catalog settings. Before allowing customer image generation, confirm `DATABASE_URL`, `OPENAI_API_KEY`, `APP_URL`, and `NEXT_PUBLIC_SITE_URL` are present on the existing Worker. Store `OPENAI_API_KEY` as a Worker secret, not a plain text variable. Authentication email delivery also needs `RESEND_API_KEY` and `AUTH_FROM_EMAIL`.

The image flow sends the original room image to OpenAI and sends style/product descriptions as text; it does not send retailer product photographs. Each successful room render consumes one verified-account design credit. A failed provider request is logged and refunded.

## Release checks

After Cloudflare authorization, confirm the build succeeds on the preview, then verify the current API routes and product selection, account verification, brief creation, image generation, credit debit/refund and saved-room privacy before assigning production traffic. Keep bedroom selection disabled until cleared bedroom products and its generation flow are ready.
