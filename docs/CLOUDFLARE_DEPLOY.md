# Transform My Room — Cloudflare Workers migration

This configuration lives on the `cloudflare-workers-migration` branch, separate from `main`. Do not change public DNS or the production domain until the Worker builds, routes and critical user journeys are tested.

## Source

- GitHub: `miikemarf9/Ai-interior-design`
- Worker name: `transformmyroom`
- Production domain (when ready): `https://transformmyroom.com`
- Alternative hostname: `https://www.transformmyroom.com`
- Platform: Cloudflare Workers + OpenNext (full-stack Next.js; **not** static Pages hosting).

## Cloudflare setup

1. In Cloudflare, open Workers & Pages → Create → Import a repository.
2. Authorise the **Cloudflare GitHub App** for the `miikemarf9/Ai-interior-design` repository. The separate ChatGPT GitHub connection is not sufficient.
3. Choose `cloudflare-workers-migration` branch for first builds, to avoid changing the current Vercel deployment.
4. Use Node.js 22 and install via `npm install`; build command `npm run cf:build`; deploy command `npm run cf:upload`.
5. This repository has `wrangler.jsonc` and `open-next.config.ts`; do not select the static Cloudflare Pages preset.

## Environment and credentials

Copy the **required production** values from the current host to **Cloudflare Workers Build variables and secrets and, separately, runtime Worker secrets**. See `.env.example`. In particular: `DATABASE_URL`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `AUTH_FROM_EMAIL`, `APP_URL`, `NEXT_PUBLIC_SITE_URL`, and the auth/rate-limit/beta secrets.

- Set `APP_URL=https://transformmyroom.com`.
- Set `NEXT_PUBLIC_SITE_URL=https://transformmyroom.com`.
- Never commit private keys, Postgres URLs or Awin feed URLs to Git.
- Review production-only settings, image uploads/storage, response limits and email verification before allowing beta traffic.
- Verify database connectivity, auth/session cookies, account creation/verification, passwords, brief, catalogue, image generation, credit debit/refunds, share URLs and emails on the Worker preview URL.

## Go-live

1. Check that the Cloudflare Worker builds and is functional (including API routes), and that the beta launch gates are satisfied.
2. Attach `transformmyroom.com` as a Cloudflare Worker custom domain. Configure `www.transformmyroom.com` as a second custom domain or managed redirect to the apex.
3. Confirm Cloudflare DNS, HTTPS certificates, permanent redirects and canonical URL.
4. Only after a full end-to-end test should you shift public traffic and stop the previous host.

## Status

- Domain registration and Cloudflare zone: confirmed active on 28 October 2026.
- Cloudflare's GitHub build connection currently fails with an OAuth/app authorisation error; user must approve Cloudflare's GitHub App.
- This branch prepares configuration but has not passed a Cloudflare build. It is **not deployed**.
