# E-portfolio v2 — Greenfield Rebuild Design

**Date:** 2026-05-02
**Author:** Christopher Corbin (with Claude)
**Status:** Approved (pending user review of this written spec)
**Scope:** Replaces the in-place refactor previously planned in [`2026-05-02-eportfolio-refactor-sub1-design.md`](./2026-05-02-eportfolio-refactor-sub1-design.md). Subsumes what were originally sub-projects 1, 2, 3, and 4 into one coherent rebuild.

---

## 1. Background

### Why this exists
On 2026-05-02 the live site `https://christophercorbin.cloud` returned HTTP 522 (Cloudflare origin timeout). Diagnostics confirmed the AWS-side delivery (S3 + CloudFront) was healthy; the break was at the Cloudflare → CloudFront hop. No code change had landed that day — pure configuration drift in a system whose state lived only in dashboards.

Initial brainstorming produced an in-place refactor design (the superseded spec) that would have:
- Flipped Cloudflare from orange-cloud (proxy on) to gray-cloud (DNS only)
- Captured the Cloudflare DNS state in OpenTofu
- Added monitoring, dependabot grouping, workflow consolidation, branch cleanup
- Kept the existing S3 + CloudFront + multi-account + SAM Lambda backend topology

During plan-writing, two questions surfaced that shifted the architecture:

1. **"Would Amplify be better?"** — Amplify Hosting + Amplify Gen 2 backend collapses sub-projects 1+2+3 into one effort: it eliminates the multi-account dance, the cross-account CloudFront invalidation, the OAC config, the deploy workflows, and the SAM template, all by replacing them with one product.

2. **"Is it worth refactoring this repo or starting fresh?"** — Given the breadth of changes (new frontend stack, new backend, new infra, new accounts) and that the site is already down, a fresh repo proved cleaner than a multi-thousand-line in-place refactor. The old repo gets archived as a public artifact (preserves the engineering journey for portfolio purposes).

### What this design represents
A **greenfield rebuild** of the portfolio site:
- New repository: `eportfolio-v2`
- New frontend stack: Astro + Tailwind CSS, with React islands available where needed
- New backend: Amplify Gen 2 TypeScript functions + DynamoDB + SES (replaces Python Lambda + SAM)
- New hosting: AWS Amplify Hosting (replaces S3 + CloudFront)
- DNS unchanged in *provider* (still Cloudflare for Email Routing) but moved to gray-cloud + OpenTofu-managed
- Old AWS resources (S3 bucket, CloudFront distribution, SAM stack, dev account) decommissioned after a 7-day soak
- Old GitHub repo archived with a README pointing at the new one

---

## 2. Goals

| # | Goal | Measurable outcome |
|---|---|---|
| G1 | Site is reachable at `https://christophercorbin.cloud` on the new infrastructure | `curl -I` returns HTTP 200 served via Amplify Hosting |
| G2 | Frontend is built with Astro + Tailwind, content authored as components | `eportfolio-v2/src/pages/index.astro` exists; component files split by section |
| G3 | Backend (contact form) runs on Amplify Gen 2 TypeScript functions | Contact form POSTs to Amplify-managed endpoint, writes to DynamoDB, sends email via SES |
| G4 | All infrastructure (Amplify, DNS, monitoring) is OpenTofu-managed | `tofu plan` is no-op for `terraform/cloudflare/`, `terraform/aws-amplify/`, `terraform/aws-monitoring/` |
| G5 | Outages detected within ~1.5 hours | CloudWatch Synthetics canary on 30-min schedule alarming via SNS → email |
| G6 | Old AWS resources fully decommissioned after 7-day soak | S3 bucket, CloudFront distribution, SAM stack, dev account resources, IAM roles all removed; AWS bill drops to Amplify-only |
| G7 | Old GitHub repo archived with clear pointer to v2 | `christophercorbin/AWS-eportfolio` is archived; final README commit links to `eportfolio-v2` and to this spec |
| G8 | New repo has CI for typecheck/build/security on every PR | `eportfolio-v2/.github/workflows/ci.yml`, `security.yml`, `lighthouse.yml`, `auto-merge.yml` all green on PRs |
| G9 | Frontend visual quality is intentional and distinctive | Implementation uses the `frontend-design` skill; no generic AI-aesthetic Bootstrap-card-grid look |

## 3. Non-goals

- Re-doing or refreshing **content** (project descriptions, achievements, bio copy). Content ports verbatim; a separate content-refresh pass can happen later.
- Migrating **Cloudflare Email Routing** away from Cloudflare. Email Routing is the only reason Cloudflare is in the path; it stays.
- **Adding new portfolio features** (blog, dynamic project pages, comments, analytics dashboards). Out of scope. The new site replicates the current site's information architecture.
- **Custom backend features** beyond the contact form (no auth, no user accounts, no admin panel). Amplify Gen 2's contact handler does one thing.
- **Migration of git history** from the old repo. The new repo starts with a fresh `initial commit`. The old repo's history is preserved by archiving (not deleting).

---

## 4. Architecture

### Target end-state diagram

```
                     ┌──────────────────────────────────────┐
                     │ GitHub: christophercorbin/eportfolio-v2│
                     │  ─ src/pages/, src/components/  (Astro) │
                     │  ─ amplify/  (Amplify Gen 2 backend)    │
                     │  ─ terraform/  (cloudflare, monitoring) │
                     │  ─ .github/workflows/  (4 wf)           │
                     └────────────────────┬─────────────────────┘
                                          │
                  ┌───────────────────────┼─────────────────────────┐
                  │                       │                         │
                  ▼                       ▼                         ▼
        ┌─────────────────┐   ┌──────────────────────┐   ┌──────────────────┐
        │ Amplify Hosting │   │ Amplify Gen 2 Backend│   │ tofu apply       │
        │  (auto-deploys  │   │  (auto-deploys per   │   │  (Cloudflare DNS,│
        │   per branch)   │   │   branch sandbox)    │   │   AWS monitoring)│
        └────────┬────────┘   └──────────┬───────────┘   └─────────┬────────┘
                 │                       │                         │
                 │     AWS prod account 590716168923              │
                 │  ┌─────────────────────────────────────────┐    │
                 │  │ Lambda (TS) ─► DynamoDB ─► SES email   │    │
                 │  │ (per-branch resources, fully isolated)  │    │
                 │  └─────────────────────────────────────────┘    │
                 │                                                 │
                 ▼                                                 ▼
   main.d2xyz.amplifyapp.com                          Cloudflare DNS (gray)
        │                                                       │
        └─────────────────► Cloudflare CNAME ◄──────────────────┘
                                  │
                                  ▼
                       https://christophercorbin.cloud
```

### Topology shifts vs. today

| Today | Target | Why |
|---|---|---|
| Multi-account AWS (mgmt + prod + dev) | Single account (prod 590716168923) | Eliminates cross-account complexity; mgmt + dev accounts deletable post-decommission |
| S3 bucket + CloudFront + OAC + cross-account invalidation | Amplify Hosting (auto-deploys, auto-invalidates, auto-cert) | One service replaces five moving parts |
| Cloudflare orange-cloud proxy | Cloudflare gray-cloud (DNS only) | Eliminates 522-class outages; same Email Routing functionality |
| SAM template + Python Lambda backend | Amplify Gen 2 TypeScript backend | Per-branch backend sandboxing; no SAM/CFN to maintain |
| Dev AWS account for environment isolation | Per-branch Amplify environments (auto-provisioned) | Each `dev-*` branch gets full isolated stack for free |
| Vanilla 37KB single-page index.html | Astro components by section + Tailwind | Component reuse, smaller per-page payloads, build-time optimization |
| Inline CSS monolith (28KB) | Tailwind utility classes + scoped Astro styles | No more "edit one rule, hunt 12 places" |
| 11 GitHub workflows (4 real + 7 stubs) | 4 workflows in new repo: `ci.yml`, `security.yml`, `lighthouse.yml`, `auto-merge.yml` | Amplify owns deploys; CI only handles validation |
| No uptime monitoring | CloudWatch Synthetics 30-min canary → SNS email | Detects outages within ~90 min |
| Dashboard-only DNS state | Cloudflare DNS in OpenTofu, S3 backend | Drift-proof, peer-reviewable |
| 9 stale Dependabot PRs ungrouped | Grouped weekly per ecosystem; auto-merge patch+minor dev-deps | Near-zero noise |
| Old repo `AWS-eportfolio` accumulating issues | Archived (read-only) with README pointer to v2 | Preserves history as a portfolio artifact without ongoing drift |

---

## 5. Components

### 5.1 New repository — `christophercorbin/eportfolio-v2`

**Created via** `gh repo create christophercorbin/eportfolio-v2 --public --description "Personal portfolio site (v2) — Astro + Tailwind + AWS Amplify Gen 2"` and cloned to `~/Eportfolio/eportfolio-v2/` (sibling to the existing `~/Eportfolio/E-portfolio/`).

**Initial directory structure:**
```
eportfolio-v2/
├── src/
│   ├── pages/
│   │   ├── index.astro           # Main portfolio page
│   │   └── resume.astro          # Standalone resume page
│   ├── components/
│   │   ├── Hero.astro
│   │   ├── About.astro
│   │   ├── Experience.astro
│   │   ├── Skills.astro
│   │   ├── Projects.astro
│   │   ├── Certifications.astro
│   │   ├── Contact.astro          # Contains React island for form
│   │   ├── ContactForm.tsx        # React island, calls Amplify backend
│   │   └── Nav.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   └── styles/
│       └── global.css             # Tailwind directives + occasional custom rules
├── public/
│   ├── images/
│   │   └── profile-photo.jpg      # Brought from old repo
│   └── assets/
│       └── Christopher_Corbin_Resume.pdf  # Brought from old repo
├── amplify/                       # Amplify Gen 2 backend
│   ├── backend.ts                 # Backend definition entry point
│   ├── data/
│   │   └── resource.ts            # DynamoDB submissions table
│   ├── functions/
│   │   └── contact-handler/
│   │       ├── handler.ts         # TypeScript port of contact_handler.py
│   │       └── resource.ts        # Function resource definition
│   └── package.json
├── terraform/
│   ├── bootstrap.sh               # Creates S3 state bucket + DynamoDB lock table
│   ├── cloudflare/                # DNS records (imported from existing zone)
│   ├── aws-amplify/               # Amplify app + branches (imported after console setup)
│   └── aws-monitoring/            # Synthetics canary + SNS topic
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Astro build + TS tests on PRs
│   │   ├── security.yml           # TruffleHog + CodeQL + npm audit
│   │   ├── lighthouse.yml         # Lighthouse CI on PRs
│   │   └── auto-merge.yml         # Dependabot auto-merge for safe bumps
│   └── dependabot.yml             # Grouped weekly per ecosystem
├── tests/
│   └── functions/
│       └── contact-handler.test.ts # Unit tests for backend
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── README.md                      # Includes link to old archived repo
├── CLAUDE.md                      # Codebase guide for Claude (replaces old one)
└── .gitignore
```

### 5.2 Frontend — Astro + Tailwind

**Setup:**
- Astro v5+ via `npm create astro@latest -- --template minimal --typescript strict`
- Tailwind CSS via `npx astro add tailwind`
- React integration via `npx astro add react` (only used for the contact form island)

**Component strategy:**
- Each section of the current `index.html` becomes its own `.astro` component (Hero, About, Experience, etc.)
- `index.astro` composes them: `<Hero /><About /><Experience />` etc.
- Resume page (`resume.astro`) is a separate route, not a section
- Components are mostly static HTML+Tailwind; only `ContactForm.tsx` ships JS to the client (React island)
- No client-side router — Astro's per-page hydration is enough for a content site

**Design quality** is the responsibility of the implementation phase and will use the `frontend-design` skill. Spec-level commitment: avoid generic AI aesthetic (Bootstrap-card-grid, default Inter, slight gradients). Specific design direction left to that skill's exploration during build.

**Content port (verbatim from old `index.html`):**
- Hero copy and CTA buttons
- About bio paragraph + stats (2000+ resources, 500+ CVEs, 97.2% SOC 2)
- Experience timeline entries (GovTech Barbados, Protexxa, TORE, iShop)
- Skills categories
- Project cards (SOC2 ML Analyzer, Task Management, Secure Moodle)
- Certifications (AWS SAA, CompTIA Sec+, Cybersecurity Analyst, BSc CS, AWS DevOps Pro in progress, Cisco)
- Contact info
- Files: `images/profile-photo.jpg`, `assets/Christopher_Corbin_Resume.pdf`

**Deliberately NOT ported:** old `styles.css` (replaced by Tailwind + scoped styles), old `script.js` non-form behavior (replaced by Astro features), old `script.js` form behavior (rewritten in `ContactForm.tsx` to call Amplify backend).

### 5.3 Backend — Amplify Gen 2 (TypeScript)

**Module: `amplify/`**

`amplify/backend.ts` — top-level definition that wires functions + data:
```typescript
import { defineBackend } from '@aws-amplify/backend';
import { contactHandler } from './functions/contact-handler/resource';
import { data } from './data/resource';
export const backend = defineBackend({ contactHandler, data });
```

`amplify/data/resource.ts` — defines a `Submission` model (replaces the existing DynamoDB table):
- Fields: `name: string!`, `email: string!`, `subject: string`, `message: string!`, `submittedAt: datetime`, `ttl: integer` (30-day expiry)
- Authorization: public-create (anyone can POST), authenticated-read (only you can read; later optional, deferred for now)
- Generates DynamoDB table + AppSync GraphQL API automatically (Amplify-managed)

`amplify/functions/contact-handler/handler.ts` — TypeScript port of `src/contact_handler.py`:
- Validates input (name, email format, message length)
- Writes to Submission model via Amplify Data client
- Sends email via SES SDK (`@aws-sdk/client-ses`) to `christophercorbin24@gmail.com`
- Returns CORS headers for the new domain

`amplify/functions/contact-handler/resource.ts` — declares the function's runtime, env vars (`CONTACT_EMAIL`), and IAM permissions (DynamoDB write, SES SendEmail).

**Per-branch behavior:** Amplify Gen 2 automatically provisions per-branch sandboxes. Push to `main` → prod env. Push to `dev-foo` → `dev-foo` env with its own DynamoDB table, Lambda, AppSync API. Cleanup is automatic when the branch is deleted.

**Tests:** `tests/functions/contact-handler.test.ts` — unit tests using Vitest. Mocks the Amplify Data client and SES client. Tests: valid submission writes to DDB and triggers SES; invalid email rejected; missing required fields rejected.

### 5.4 Cloudflare DNS (gray-cloud, OpenTofu-managed)

Same approach as the superseded spec, just with the CNAME pointing to the Amplify hostname instead of CloudFront.

**State to preserve:**
- All existing MX records for Email Routing
- All TXT records (SPF / DKIM / DMARC, Cloudflare verification)
- Any CAA records

**State to change at cutover:**
- Apex `christophercorbin.cloud` and `www.christophercorbin.cloud` CNAMEs → the Amplify-provided hostname (format like `<branch>.<app-id>.amplifyapp.com` or the custom domain hostname Amplify creates after domain association)
- Both records `proxied = false` (gray cloud)

**Module: `terraform/cloudflare/`**
- `provider.tf` — `cloudflare/cloudflare ~> 4.x`, S3 backend `s3://corbin-tfstate-prod/cloudflare/terraform.tfstate`, DynamoDB lock table `corbin-tfstate-locks`
- `main.tf` — `cloudflare_record` resources for every record discovered via `tofu import`
- `variables.tf` — `zone_id` (data lookup by `name = "christophercorbin.cloud"`), `amplify_target` (the Amplify hostname after domain association)
- `outputs.tf` — record IDs
- API token: `Zone:DNS:Edit` on `christophercorbin.cloud` only; stored in `~/.cloudflare-token` locally, GitHub secret `CLOUDFLARE_API_TOKEN` for CI

### 5.5 Amplify Hosting + Backend (OpenTofu-imported after console setup)

**Module: `terraform/aws-amplify/`**
- Created in console first (faster path to working site)
- Then imported via `tofu import` into resources:
  - `aws_amplify_app` — the app itself, including build settings, environment variables, branch auto-deploy config
  - `aws_amplify_branch` × N — one per branch (`main`, plus any `dev-*` branches active)
  - `aws_amplify_domain_association` — the custom domain `christophercorbin.cloud`
- After import, `tofu plan` should be no-op
- Subsequent changes (e.g., adding env vars, changing build settings) go through OpenTofu

### 5.6 CloudWatch Synthetics canary (OpenTofu-managed)

**Module: `terraform/aws-monitoring/`**
- `provider.tf` — AWS provider, region `us-east-1`, S3 backend `s3://corbin-tfstate-prod/aws-monitoring/terraform.tfstate`
- `canary.tf` — `aws_synthetics_canary`:
  - Runtime: `syn-nodejs-puppeteer-9.0`
  - Schedule: `rate(30 minutes)`
  - Script: HTTP GET `https://christophercorbin.cloud/`, assert HTTP 200 and body contains `Christopher Corbin`
  - Artifact bucket: `corbin-canary-artifacts-prod` (lifecycle: 30-day expiry)
- `alarm.tf` — `aws_cloudwatch_metric_alarm` on `SuccessPercent < 80%`, 2 of 3 datapoints
- `sns.tf` — SNS topic `eportfolio-alerts`, email subscription to `christophercorbin24@gmail.com`

**Cost:** ~$1.75/month for canary + negligible storage + SNS free tier. Same as superseded spec.

### 5.7 GitHub Actions for `eportfolio-v2`

| File | Triggers | Jobs |
|---|---|---|
| `ci.yml` | All PRs to `main` | Astro typecheck (`astro check`), Astro build (`npm run build`), backend unit tests (`vitest run`) |
| `security.yml` | Push to main + weekly Mon 09:00 UTC | TruffleHog (secrets), CodeQL (TS), `npm audit --audit-level=high` |
| `lighthouse.yml` | All PRs to `main` | Lighthouse CI against the Amplify preview URL for the PR; fail if performance/a11y/SEO/best-practices below 90 |
| `auto-merge.yml` | Dependabot PR opened | Polls CI status; merges when green and labeled `dependabot-automerge` (auto-applied for patch+minor dev-deps in `package.json` devDependencies and `amplify/package.json` devDependencies) |

**Amplify deploys:** handled entirely by Amplify Hosting itself — no GitHub Actions workflow needed. Push to `main` → Amplify auto-builds and deploys to prod env. Push to `dev-*` → Amplify auto-creates a preview env and posts the URL as a PR comment.

### 5.8 Dependabot config (`eportfolio-v2/.github/dependabot.yml`)
- Group all minor + patch updates per ecosystem (`npm`, `github-actions`) into one weekly PR per group
- Major bumps continue as individual PRs
- `auto-merge.yml` applies `dependabot-automerge` label only to patch+minor dev-dep PRs

### 5.9 Documentation (`eportfolio-v2/`)
- **`README.md`** — project description, architecture overview, local dev setup, link to old archived repo
- **`CLAUDE.md`** — codebase guide for Claude: stack overview, where things live, how to run locally, how to deploy
- **`docs/runbook-outage.md`** — minimal "site is down" runbook adapted for the Amplify topology
- **NO** sprawling `docs/` directory like the old repo — keep documentation lean

### 5.10 Old repo archival — `christophercorbin/AWS-eportfolio`

After the new site is live and the soak passes:
1. Add a final commit to `main` updating `README.md` with an archive notice:
   ```markdown
   # ⚠️ Archived 2026-05-XX

   This repository is archived. The site has been rebuilt as **[eportfolio-v2](https://github.com/christophercorbin/eportfolio-v2)** using AWS Amplify Gen 2 + Astro + Tailwind.

   See the [migration design doc](https://github.com/christophercorbin/eportfolio-v2/blob/main/docs/superpowers/specs/2026-05-02-eportfolio-v2-greenfield-design.md) for the why.

   This repo is preserved as a record of the v1 architecture (multi-account S3+CloudFront+SAM Lambda).
   ```
2. Run `gh repo archive christophercorbin/AWS-eportfolio` — read-only, no new issues/PRs/commits, all open Dependabot PRs auto-close, branches preserved
3. The repo URL stays valid; people can still browse history; but it stops accumulating drift

### 5.11 Old AWS resource decommissioning

After the 7-day soak passes:
1. **S3:** delete bucket `christopher-corbin-portfolio-20251005195625` and contents (after backing up `index.html` etc. to local just in case, though already preserved in archived repo)
2. **CloudFront:** disable distribution `E34Q2E7TZIYZAB`, then delete (CloudFront requires disable-then-delete with a wait)
3. **SAM:** delete CloudFormation stack `christopher-corbin-portfolio-backend` (removes Lambda, API Gateway, DynamoDB, IAM roles)
4. **Dev account 934862608865:** delete all resources first (SAM stack, S3 bucket if any), then optionally close the account itself (not required; an empty account costs nothing)
5. **Mgmt account 438465156498:** keep — it owns Route 53 hosted zones (if any), the Cloudflare-related ACM certs (if any), and is your AWS Organizations payer. Don't close it.
6. **IAM roles:** delete `GitHubActionsDeployRole` (in prod and dev accounts), the cross-account CloudFront invalidation role, OIDC trust policies for the old repo
7. **GitHub secrets:** delete from old repo: `CONTACT_EMAIL`, `CLOUDFRONT_ROLE_ARN`, `CLOUDFRONT_EXTERNAL_ID`, `CLOUDFRONT_DOMAIN` (the new repo will have its own subset)

---

## 6. Implementation sequence

Four PRs, each leaves a working state if the next never happens.

### PR 1 — "Bootstrap eportfolio-v2 with frontend on Amplify (auto-URL only)"

1. `gh repo create christophercorbin/eportfolio-v2 --public ...`
2. Clone to `~/Eportfolio/eportfolio-v2/`
3. Scaffold Astro + Tailwind + React via `npm create astro` + `astro add`
4. Build out all section components (Hero, About, Experience, Skills, Projects, Certifications, Contact, Nav). **Use the `frontend-design` skill for the visual design phase.** Port content verbatim from old `index.html`.
5. Build `resume.astro` page
6. Copy `images/profile-photo.jpg` and `assets/Christopher_Corbin_Resume.pdf` from old repo
7. Add `README.md`, `CLAUDE.md`, `.gitignore`
8. Push to `main`
9. Create Amplify Hosting app via console: connect to `christophercorbin/eportfolio-v2` repo, point at `main`, accept auto-detected Astro build settings
10. Wait for first build to complete; visit `https://main.<app-id>.amplifyapp.com` and verify site renders correctly
11. Open PR (or single-commit on `main` since it's a fresh repo — may not need a PR for the bootstrap commit)

**Exit criteria:** new repo exists; site loads at the auto-generated Amplify URL; all sections render with correct content; no React island wired to a backend yet (contact form submits to a stub or shows "coming soon").

### PR 2 — "Add Amplify Gen 2 backend + wire contact form"

12. Initialize Amplify Gen 2 backend: `cd eportfolio-v2 && npm create amplify@latest -- --template react`. Adjust generated structure to match Section 5.3 layout.
13. Define `Submission` data model in `amplify/data/resource.ts`
14. Implement `amplify/functions/contact-handler/handler.ts` — validation + DynamoDB write + SES email
15. Wire `ContactForm.tsx` React island to call the Amplify backend (using Amplify client SDK)
16. Write Vitest unit tests for the handler
17. Configure SES: ensure `christophercorbin24@gmail.com` is verified in SES `us-east-1` in the prod account (likely already verified from old setup; verify and re-add if needed)
18. Add GitHub Actions: `ci.yml`, `security.yml`, `lighthouse.yml`, `auto-merge.yml`
19. Add `.github/dependabot.yml` with grouped weekly config
20. Push backend changes to `main` — Amplify auto-deploys backend to prod env
21. Test contact form on `https://main.<app-id>.amplifyapp.com` — submit a test message, verify it lands in DynamoDB and that the email arrives at `christophercorbin24@gmail.com`
22. Import Amplify resources to OpenTofu: write `terraform/aws-amplify/` and run `tofu import` for app, branch, domain (if added). Confirm `tofu plan` is no-op.

**Exit criteria:** contact form posts to live Amplify backend, DynamoDB receives, email arrives, all CI green, Amplify resources mirrored in OpenTofu.

### PR 3 — "Cutover christophercorbin.cloud to Amplify + monitoring"

23. In Amplify console, add custom domain `christophercorbin.cloud` to the app. Amplify provisions ACM cert and provides the target hostname for DNS.
24. Bootstrap OpenTofu state: run `terraform/bootstrap.sh` to create `corbin-tfstate-prod` S3 bucket + `corbin-tfstate-locks` DynamoDB lock table in prod account
25. Create Cloudflare API token (`Zone:DNS:Edit` on `christophercorbin.cloud` only). Store as `CLOUDFLARE_API_TOKEN` env var locally + GitHub secret in eportfolio-v2 repo
26. Write `terraform/cloudflare/` module
27. `tofu import` every existing Cloudflare record — confirm `tofu plan` is no-op for everything except the apex/www CNAMEs (which need to change from CloudFront → Amplify hostname and from `proxied = true` to `proxied = false`)
28. `tofu apply` the apex/www CNAME changes — site should now serve via Amplify under `https://christophercorbin.cloud`
29. Verify: `curl -I https://christophercorbin.cloud` returns HTTP 200; browser load shows new site; contact form works on real domain
30. Write `terraform/aws-monitoring/` module (canary + SNS + alarm) — script targets `https://christophercorbin.cloud`
31. `tofu apply`. Confirm SNS email subscription (click the confirmation link)
32. Trigger one synthetic failure (point canary at bad URL temporarily) → verify alarm fires + email arrives → revert
33. Add `docs/runbook-outage.md` to eportfolio-v2
34. **Begin 7-day soak.** Update `README.md` of eportfolio-v2 to indicate "Live"; do not yet decommission anything.

**Exit criteria:** custom domain serves new site; canary green; alert verified; site working for normal traffic.

### PR 4 — "Decommission old AWS resources + archive old repo"

*Run after 7-day soak from PR 3 with no canary alarms and no user-reported issues.*

35. Backup the contents of the old S3 bucket to local archive (cheap insurance — the static files already exist in the archived repo, but a backup is fast)
36. Delete S3 bucket `christopher-corbin-portfolio-20251005195625` (empty + delete)
37. Disable then delete CloudFront distribution `E34Q2E7TZIYZAB` (~15 min wait between disable and delete)
38. Delete SAM CloudFormation stack `christopher-corbin-portfolio-backend` from prod account
39. Delete dev-account SAM stack `christopher-corbin-portfolio-backend-dev` (and any S3 buckets in dev account)
40. Delete IAM roles in prod account: `GitHubActionsDeployRole` (used by old repo's deploy workflows), the cross-account CloudFront invalidation role
41. Delete OIDC trust policies referencing the old repo
42. Delete GitHub secrets in old repo (cosmetic, since the repo will be archived)
43. Update old repo's `README.md` with the archive notice from Section 5.10
44. Commit + push to `christophercorbin/AWS-eportfolio:main`
45. Run `gh repo archive christophercorbin/AWS-eportfolio --yes`
46. Verify: AWS billing dashboard shows only Amplify + monitoring + Route 53 zones (if any) charges going forward

**Exit criteria:** old AWS resources gone; old repo archived with pointer; AWS bill drops to ~$5/month or less; new site continues serving normally.

---

## 7. Risks and rollback

| ID | Risk | Likelihood | Impact | Mitigation | Rollback |
|---|---|---|---|---|---|
| R1 | Amplify auto-detects Astro build incorrectly | Low | PR 1 blocked | Astro is a marquee Amplify-supported framework; if detection fails, manually configure build command (`npm run build`) and output dir (`dist/`) in console | Manually set build settings; works the same |
| R2 | Amplify Gen 2 backend has unfamiliar gotchas | Medium | PR 2 takes longer than estimated | Allocate buffer; reference Amplify docs and the official examples; don't try to use unrelated Amplify features (auth, storage) — only data + functions | Backend can stay as old SAM stack temporarily; new frontend talks to old API URL via env var; complete backend port in a follow-up |
| R3 | `tofu import` on Amplify resources is incomplete | Medium | PR 2 step 22 partial | Amplify provider coverage in `aws_amplify_*` is comprehensive but not 100%; if a setting can't be imported, manage that one in console for now and document | Skip the import for that field; document in spec |
| R4 | SES sending fails after backend port (verification or region issue) | Medium | Contact form silent failure | SES verification carries over since same account/region; verify in PR 2 step 17 *before* declaring complete; add explicit error logging in handler | Roll back to old contact form (still on old API) by updating env var until SES fixed |
| R5 | `tofu import` on Cloudflare records misses something | Medium | PR 3 step 27 surprises | Same canary as superseded spec — `tofu plan` after import is the truth check | If incomplete, narrow OpenTofu management to records we can manage; manually maintain edge cases in dashboard until provider catches up |
| R6 | Custom domain ACM cert validation fails | Low | PR 3 step 23 blocked | Amplify validates cert via DNS challenge; you'll need to add a TXT record to Cloudflare; should be straightforward | Retry domain association; can take 30+ min for cert validation to complete |
| R7 | Cutover apex/www flip causes brief outage | Low | <2 min | Cloudflare TTLs are short (~300s); both sides are healthy at switch time | Re-apply old CNAME values via OpenTofu (one apply) |
| R8 | 7-day soak surfaces a bug | Medium | Decommission deferred | The whole point of the soak is to catch things; canary detects most; user reports catch the rest | Don't decommission; fix forward, soak again |
| R9 | Old IAM role deletion breaks something we forgot about | Low | Some old workflow fails | Old repo is archived; nothing should be running. Check for orphaned scheduled events/Lambda triggers before deleting IAM roles | Recreate role from CloudTrail events if needed |
| R10 | Frontend design quality is mediocre (the AI-Bootstrap-card-grid risk) | Medium | Site looks generic | PR 1 step 4 explicitly invokes `frontend-design` skill which targets distinctive design; iterate on visual polish before declaring PR 1 done | Iterate; design is changeable post-launch without infra impact |
| R11 | Vitest tests pass locally but fail in CI | Low | PR 2 CI red | Standard JS-test flake risk; pin Node version in CI; use `npm ci` not `npm install` | Debug CI logs; fix |
| R12 | Lighthouse CI scores below threshold blocking PRs | Medium first PR | Annoyance | Astro's defaults score very high (~95+) for content sites; if early PRs fail, tune thresholds rather than block | Lower threshold; revisit when confident |

## Rollback summary

| Step | Rollback |
|---|---|
| PR 1 (new repo) | Don't merge; site still serves from old infra |
| PR 2 (backend) | Frontend can target old API URL via env var; old backend still running |
| PR 3 step 28 (DNS flip) | `tofu apply` previous state, or revert in dashboard |
| PR 3 step 31 (canary) | `tofu destroy` aws-monitoring module |
| PR 4 (decommission) | Largely irreversible by design; that's why the 7-day soak matters |

---

## 8. Open items requiring action before / during execution

1. **Cloudflare API token** — user creates with scope `Zone:DNS:Edit` on `christophercorbin.cloud` only at start of PR 3
2. **Working AWS local profile** — current `ctcm-dev` profile is not configured. User provides a working profile name (likely `aws sso login` or fresh `aws configure`) before starting PR 1's Amplify console work
3. **SES verification for new account context** — verify in PR 2 that `christophercorbin24@gmail.com` is still verified in SES `us-east-1` for the prod account. If not, re-verify (check email for the SES verification link).
4. **GitHub permissions** — confirm Amplify Hosting has access to install on `christophercorbin/eportfolio-v2` (will request OAuth permissions during console setup)
5. **Decision: archive vs delete dev account 934862608865** — leaving an empty AWS account around is free but adds clutter. Default: leave it (zero ongoing cost; closing requires Organizations admin steps and is irreversible). Confirm during PR 4.

## 9. Approvals log

| Section | User decision | Date |
|---|---|---|
| Pivot to Amplify | Yes (re-opened brainstorming during plan-writing) | 2026-05-02 |
| Pivot to fresh repo | Yes (archive old, build v2) | 2026-05-02 |
| Migration strategy | A (side-by-side then cutover) | 2026-05-02 |
| Amplify IaC approach | B (console first, OpenTofu import after) | 2026-05-02 |
| Backend strategy | Option 1 / 3a-B (full port to Amplify Gen 2 TypeScript) | 2026-05-02 |
| Dev environment | Option 1 / 3b-A (drop dev AWS account entirely) | 2026-05-02 |
| Frontend stack | Astro + Tailwind (with React islands) | 2026-05-02 |
| New repo name | `eportfolio-v2` | 2026-05-02 |
| Local path | A (`~/Eportfolio/eportfolio-v2/`, sibling to old) | 2026-05-02 |
| AWS account for Amplify | A (prod 590716168923) | 2026-05-02 |
| Content migration | 7a-A + 7b + 7c (verbatim port; refresh later) | 2026-05-02 |
| Cutover/decommission timeline | B (7-day soak before decommission) | 2026-05-02 |
| Old repo handling | Archive with README pointer to v2 | 2026-05-02 |
| New repo CI | Astro typecheck + build, TS tests, security (TruffleHog/CodeQL/npm audit), Lighthouse CI, grouped Dependabot + auto-merge | 2026-05-02 |
| Monitoring | 30-min CloudWatch Synthetics, email alerts | 2026-05-02 (carried from superseded spec) |
| IaC tool | OpenTofu, S3+DynamoDB backend in prod account | 2026-05-02 (carried from superseded spec) |
