# eportfolio-v2

Personal portfolio site for Christopher Corbin — AWS Solutions Architect & Security Engineer.

**Live:** https://christophercorbin.cloud

## Stack

- **Frontend:** Astro 6 + Tailwind CSS v4 + React 19 (islands only)
- **Backend:** AWS Amplify Gen 2 (TypeScript Lambda + DynamoDB + SES) — *added in PR 2*
- **Hosting:** AWS Amplify Hosting
- **DNS:** Cloudflare (gray-cloud, OpenTofu-managed) — *cutover in PR 3*
- **Infra:** OpenTofu (S3 backend in AWS account `590716168923`)

## Local development

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # production build to dist/
```

## Deployment

Pushes to `main` automatically deploy to production via AWS Amplify Hosting.
Pushes to `dev-*` branches automatically deploy to preview environments.

## Project history

This is **v2** of `christophercorbin.cloud`. The previous version lived at
[christophercorbin/AWS-eportfolio](https://github.com/christophercorbin/AWS-eportfolio)
(now archived) and used a multi-account AWS setup with S3 + CloudFront +
Python Lambda backend. v2 was rebuilt from scratch in May 2026 to:

1. Eliminate the multi-account complexity (one account, one stack)
2. Replace the bespoke S3 + CloudFront + cross-account invalidation setup with AWS Amplify Hosting
3. Modernize the frontend (vanilla HTML → Astro + Tailwind + components)
4. Capture all infrastructure state in OpenTofu (no more dashboard-only DNS)

See `docs/superpowers/specs/` for the full design rationale.

## License

MIT
