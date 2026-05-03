# E-portfolio v2 — PR 1 Implementation Plan: Bootstrap Frontend on Amplify

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a new GitHub repo (`christophercorbin/eportfolio-v2`) with an Astro + Tailwind + React frontend, port content verbatim from the existing site, deploy it to AWS Amplify Hosting, and verify the site renders correctly at the auto-generated Amplify URL. The custom domain `christophercorbin.cloud` is NOT touched in this PR — old infrastructure continues to serve it.

**Architecture:** Astro v5 (static-site generator with islands architecture) + Tailwind CSS for styling + React (used only for the interactive contact form island, which is a non-functional stub in this PR). Amplify Hosting auto-detects the Astro framework and deploys on every push. Single AWS account (prod 590716168923).

**Tech Stack:**
- **Frontend:** Astro v5+, Tailwind CSS v3+, React 18+ (islands only), TypeScript strict mode
- **Hosting:** AWS Amplify Hosting (Gen 2)
- **Auth flow during build:** GitHub OAuth (one-time, console)
- **Source repo:** `christophercorbin/eportfolio-v2` (new, public)
- **Reference repo:** `~/Eportfolio/E-portfolio/` (the current site, source of content to port)
- **Working directory for the new repo:** `~/Eportfolio/eportfolio-v2/`

**Spec reference:** `docs/superpowers/specs/2026-05-02-eportfolio-v2-greenfield-design.md`

**This is PR 1 of 4.** PRs 2 (Amplify Gen 2 backend), 3 (DNS cutover + monitoring), and 4 (decommission) will get their own plan documents written after this one ships.

---

## Prerequisites (one-time, before Task 1)

Verify these are in place before starting Task 1. If any is missing, resolve it first.

- [ ] **GitHub CLI authenticated:** `gh auth status` reports authenticated as `christophercorbin`. If not: `gh auth login`.
- [ ] **Working AWS CLI profile:** `aws sts get-caller-identity` returns the prod account ID `590716168923`. The current `ctcm-dev` profile reference in the user's shell environment is broken — set up a working profile via `aws configure` or `aws sso login` for the prod account before proceeding.
- [ ] **Node.js 20+ installed:** `node --version` reports v20.x or higher (Astro v5 requires Node 18.17.1+).
- [ ] **Working directory exists:** `ls ~/Eportfolio/` shows the existing `E-portfolio` directory.
- [ ] **Old repo accessible:** `ls ~/Eportfolio/E-portfolio/index.html` returns the file (this is where content is ported from).

---

## File Structure (target end-state after PR 1)

```
~/Eportfolio/eportfolio-v2/
├── .github/
│   └── (workflows added in PR 2; not in scope here)
├── public/
│   ├── images/
│   │   └── profile-photo.jpg          # Copied from old repo
│   ├── assets/
│   │   └── Christopher_Corbin_Resume.pdf  # Copied from old repo
│   └── favicon.svg                    # Astro default for now
├── src/
│   ├── components/
│   │   ├── Nav.astro
│   │   ├── Hero.astro
│   │   ├── About.astro
│   │   ├── Experience.astro
│   │   ├── Skills.astro
│   │   ├── Projects.astro
│   │   ├── Certifications.astro
│   │   ├── Contact.astro
│   │   └── ContactForm.tsx            # React island — STUB in this PR
│   ├── data/
│   │   └── content.ts                 # All site copy as a structured TS object
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── resume.astro
│   └── styles/
│       └── global.css                 # Tailwind directives + occasional rules
├── docs/
│   └── superpowers/
│       ├── specs/
│       │   └── 2026-05-02-eportfolio-v2-greenfield-design.md  # Copied from old repo
│       └── plans/
│           └── 2026-05-03-eportfolio-v2-pr1-bootstrap.md      # This plan, copied
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── package-lock.json
├── .gitignore
├── README.md
└── CLAUDE.md
```

---

## Task 1: Create the GitHub repository

**Files:** None (operates on GitHub).

- [ ] **Step 1: Verify the repo name is available**

Run:
```bash
gh repo view christophercorbin/eportfolio-v2 2>&1 | head -3
```
Expected: `GraphQL: Could not resolve to a Repository` (means the name is free).
If the repo already exists: stop and decide whether to delete it or pick a new name.

- [ ] **Step 2: Create the repo (no auto-init, we'll push our own initial commit)**

Run:
```bash
gh repo create christophercorbin/eportfolio-v2 \
  --public \
  --description "Personal portfolio site (v2) — Astro + Tailwind + AWS Amplify Gen 2" \
  --homepage "https://christophercorbin.cloud" \
  --disable-wiki
```
Expected output: `https://github.com/christophercorbin/eportfolio-v2`

- [ ] **Step 3: Verify creation**

Run:
```bash
gh repo view christophercorbin/eportfolio-v2 --json name,visibility,url
```
Expected: JSON with `"name":"eportfolio-v2"`, `"visibility":"PUBLIC"`.

---

## Task 2: Initialize the Astro project locally

**Files:** Creates `~/Eportfolio/eportfolio-v2/` with the Astro scaffold.

- [ ] **Step 1: Confirm the parent directory exists**

Run:
```bash
ls -la ~/Eportfolio/
```
Expected: shows `E-portfolio/` directory.

- [ ] **Step 2: Run the Astro initializer**

Run:
```bash
cd ~/Eportfolio && npm create astro@latest -- eportfolio-v2 --template minimal --typescript strict --install --no-git
```
Expected:
- Scaffolds the directory `~/Eportfolio/eportfolio-v2/`
- Installs dependencies (npm install runs)
- Does NOT initialize git (we'll do that ourselves to control the initial commit)
- Final message: "Liftoff confirmed."

- [ ] **Step 3: Verify the scaffold**

Run:
```bash
ls -la ~/Eportfolio/eportfolio-v2/
```
Expected: shows `astro.config.mjs`, `package.json`, `src/`, `public/`, `tsconfig.json`.

- [ ] **Step 4: Verify the dev server runs**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && timeout 15 npm run dev || true
```
Expected: Astro starts and prints `Local http://localhost:4321/` within 15 seconds, then is killed by timeout (this is just a smoke test that the scaffold is valid). Exit code 124 (timeout) is fine.

---

## Task 3: Add Tailwind integration

**Files:**
- Modify: `~/Eportfolio/eportfolio-v2/astro.config.mjs`
- Create: `~/Eportfolio/eportfolio-v2/tailwind.config.mjs`
- Create: `~/Eportfolio/eportfolio-v2/src/styles/global.css`

- [ ] **Step 1: Run the Astro Tailwind add command**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && npx astro add tailwind --yes
```
Expected: installs `@astrojs/tailwind` and `tailwindcss`, modifies `astro.config.mjs` to include the integration, creates `tailwind.config.mjs`.

- [ ] **Step 2: Create the global stylesheet with Tailwind directives**

Create `~/Eportfolio/eportfolio-v2/src/styles/global.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Verify Tailwind config has the right content paths**

Read `~/Eportfolio/eportfolio-v2/tailwind.config.mjs`. Confirm `content` array includes `./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}`. If missing, add it.

- [ ] **Step 4: Verify the build still succeeds**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && npm run build
```
Expected: build succeeds, output written to `dist/`. No Tailwind errors.

---

## Task 4: Add React integration (for the contact form island)

**Files:**
- Modify: `~/Eportfolio/eportfolio-v2/astro.config.mjs`
- Modify: `~/Eportfolio/eportfolio-v2/package.json`

- [ ] **Step 1: Run the Astro React add command**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && npx astro add react --yes
```
Expected: installs `@astrojs/react`, `react`, `react-dom`, `@types/react`, `@types/react-dom`. Modifies `astro.config.mjs` to register the React integration.

- [ ] **Step 2: Verify React types are recognized**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && npx tsc --noEmit
```
Expected: exits 0 (no type errors).

- [ ] **Step 3: Verify the build still succeeds**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && npm run build
```
Expected: build succeeds.

---

## Task 5: Create the directory structure for components, layouts, data

**Files:** Creates empty directories for the upcoming files.

- [ ] **Step 1: Create the directories**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && mkdir -p src/components src/data src/layouts src/styles public/images public/assets docs/superpowers/specs docs/superpowers/plans
```

- [ ] **Step 2: Verify**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && ls -la src/
```
Expected: shows `components/`, `data/`, `layouts/`, `pages/`, `styles/` (and any files Astro scaffolded, like `env.d.ts`).

---

## Task 6: Copy assets from the old repo

**Files:**
- Create: `~/Eportfolio/eportfolio-v2/public/images/profile-photo.jpg`
- Create: `~/Eportfolio/eportfolio-v2/public/assets/Christopher_Corbin_Resume.pdf`

- [ ] **Step 1: Copy the profile photo**

Run:
```bash
cp ~/Eportfolio/E-portfolio/images/profile-photo.jpg ~/Eportfolio/eportfolio-v2/public/images/profile-photo.jpg
```

- [ ] **Step 2: Copy the resume PDF**

Run:
```bash
cp ~/Eportfolio/E-portfolio/assets/Christopher_Corbin_Resume.pdf ~/Eportfolio/eportfolio-v2/public/assets/Christopher_Corbin_Resume.pdf
```

- [ ] **Step 3: Verify both files copied**

Run:
```bash
ls -la ~/Eportfolio/eportfolio-v2/public/images/ ~/Eportfolio/eportfolio-v2/public/assets/
```
Expected: both files present with non-zero size.

---

## Task 7: Extract content from old `index.html` into a structured TypeScript data file

**Files:**
- Create: `~/Eportfolio/eportfolio-v2/src/data/content.ts`

The goal is to have all site copy in one structured TypeScript object so components consume it cleanly. This makes the components themselves about presentation, and content updates are localized.

- [ ] **Step 1: Read the old index.html in full to extract content**

Run:
```bash
cat ~/Eportfolio/E-portfolio/index.html | head -500
```
Capture: hero copy, about paragraph + stats, experience entries (4: GovTech, Protexxa, TORE, iShop), skills categories, project cards (3: SOC2 ML, Task Mgmt, Secure Moodle), certifications, contact info.

- [ ] **Step 2: Create the content data file**

Create `~/Eportfolio/eportfolio-v2/src/data/content.ts` with the following structure (fill in actual copy from the old index.html):

```typescript
export const siteContent = {
  meta: {
    siteName: "Christopher Corbin",
    title: "Christopher Corbin — AWS Solutions Architect & Security Engineer",
    description: "Personal portfolio of Christopher Corbin — AWS Solutions Architect, Security Engineer, and DevOps practitioner.",
    domain: "christophercorbin.cloud",
  },
  hero: {
    name: "Christopher Corbin",
    title: "AWS Solutions Architect & Security Engineer",
    subtitle: "[copy verbatim from old index.html hero subtitle]",
    ctas: [
      { label: "View Projects", href: "#projects", primary: true },
      { label: "Get In Touch", href: "#contact", primary: false },
    ],
    photo: "/images/profile-photo.jpg",
  },
  about: {
    bio: "[copy verbatim from old index.html about paragraph]",
    stats: [
      { value: "2000+", label: "Resources Managed" },
      { value: "500+", label: "CVEs Triaged" },
      { value: "97.2%", label: "SOC 2 Compliance" },
    ],
  },
  experience: [
    {
      company: "GovTech Barbados",
      role: "[copy verbatim]",
      dates: "[copy verbatim]",
      bullets: [
        "[copy verbatim, one bullet per line]",
      ],
    },
    {
      company: "Protexxa",
      role: "[copy verbatim]",
      dates: "[copy verbatim]",
      bullets: ["[copy verbatim]"],
    },
    {
      company: "TORE",
      role: "[copy verbatim]",
      dates: "[copy verbatim]",
      bullets: ["[copy verbatim]"],
    },
    {
      company: "iShop",
      role: "[copy verbatim]",
      dates: "[copy verbatim]",
      bullets: ["[copy verbatim]"],
    },
  ],
  skills: [
    // 8 skill categories from the old index.html
    { category: "[copy verbatim]", items: ["[copy verbatim]"] },
    // ... repeat for all 8 categories
  ],
  projects: [
    {
      title: "SOC2 ML Analyzer",
      description: "[copy verbatim]",
      tech: ["[copy verbatim]"],
      links: { github: "[if present in old html]", demo: "[if present]" },
    },
    {
      title: "Task Management",
      description: "[copy verbatim]",
      tech: ["[copy verbatim]"],
      links: {},
    },
    {
      title: "Secure Moodle",
      description: "[copy verbatim]",
      tech: ["[copy verbatim]"],
      links: {},
    },
  ],
  certifications: {
    badges: [
      { name: "AWS Solutions Architect Associate", credlyId: "[from old html]" },
      { name: "CompTIA Security+", credlyId: "[from old html]" },
      { name: "CompTIA Cybersecurity Analyst", credlyId: "[from old html]" },
      { name: "BSc Computer Science", credlyId: null },
      { name: "AWS DevOps Professional (in progress)", credlyId: null },
      // Cisco badges from old html
    ],
  },
  contact: {
    email: "christophercorbin24@gmail.com",
    location: "[copy verbatim from old html]",
    socials: {
      // Whatever socials are in the old html
    },
  },
} as const;
```

**Important:** the `[copy verbatim ...]` markers above are placeholders for *you* (the implementer) to fill in by reading the old `~/Eportfolio/E-portfolio/index.html`. Do not leave them in the final committed file — the file should contain real copy. Each placeholder corresponds to specific text in the old HTML; if you can't find it there, it isn't on the site and shouldn't be invented.

- [ ] **Step 3: Verify the file typechecks**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && npx tsc --noEmit
```
Expected: exits 0.

---

## Task 8: Create the BaseLayout

**Files:**
- Create: `~/Eportfolio/eportfolio-v2/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Create the layout file**

Create `~/Eportfolio/eportfolio-v2/src/layouts/BaseLayout.astro` with:

```astro
---
import "../styles/global.css";
import { siteContent } from "../data/content";

interface Props {
  title?: string;
  description?: string;
}

const { title = siteContent.meta.title, description = siteContent.meta.description } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  </head>
  <body class="min-h-screen bg-white text-slate-900 antialiased">
    <slot />
  </body>
</html>
```

- [ ] **Step 2: Verify the build still succeeds**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && npm run build
```
Expected: build succeeds.

---

## Task 9: Create a placeholder `index.astro` that uses BaseLayout

**Files:**
- Modify: `~/Eportfolio/eportfolio-v2/src/pages/index.astro`

This is a placeholder so we can verify the layout pipeline before invoking the design skill. The actual design + content composition happens in Task 11.

- [ ] **Step 1: Replace `src/pages/index.astro` with a minimal placeholder**

Overwrite `~/Eportfolio/eportfolio-v2/src/pages/index.astro` with:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout>
  <main class="max-w-3xl mx-auto px-6 py-24">
    <h1 class="text-4xl font-bold mb-4">Christopher Corbin</h1>
    <p class="text-lg text-slate-600">
      Site under reconstruction. Components landing soon.
    </p>
  </main>
</BaseLayout>
```

- [ ] **Step 2: Verify locally**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && timeout 10 npm run dev > /tmp/astro-dev.log 2>&1 &
sleep 5
curl -s http://localhost:4321/ | head -30
kill %1 2>/dev/null
wait 2>/dev/null
```
Expected: HTML response containing `Christopher Corbin` and `Site under reconstruction`.

- [ ] **Step 3: Verify the build succeeds**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && npm run build
```
Expected: build succeeds, `dist/index.html` contains the placeholder text.

---

## Task 10: Initial git setup and first commit

**Files:**
- Create: `~/Eportfolio/eportfolio-v2/.gitignore` (Astro scaffold may have created one; verify and extend)

- [ ] **Step 1: Initialize git**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && git init -b main
```

- [ ] **Step 2: Verify/extend `.gitignore`**

Read `~/Eportfolio/eportfolio-v2/.gitignore`. Astro scaffold should have created a sensible default. Append the following lines if not already present:

```gitignore
# AWS
.aws/
*.pem
*.key
*.env
.env.*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Tofu / Terraform (added in PR 3)
.terraform/
*.tfstate
*.tfstate.backup
.tfplan

# Misc
*.log
```

- [ ] **Step 3: Wire the GitHub remote**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && git remote add origin https://github.com/christophercorbin/eportfolio-v2.git
git remote -v
```
Expected: shows `origin https://github.com/christophercorbin/eportfolio-v2.git (fetch)` and `(push)`.

Note: HTTPS is used because `gh auth status` shows the user's GitHub CLI is configured for HTTPS. The gh CLI installs a credential helper that handles auth for HTTPS pushes — no SSH key required.

- [ ] **Step 4: Stage and commit the bootstrap**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && git add . && git status --short
```
Expected: shows all the scaffold files staged. Confirm no `node_modules/`, no `.env`, no `dist/`.

Then:
```bash
cd ~/Eportfolio/eportfolio-v2 && git commit -m "$(cat <<'EOF'
chore: bootstrap Astro + Tailwind + React project

Initial scaffold from npm create astro@latest, with Tailwind CSS and
React integrations added. Includes BaseLayout, content data structure,
profile photo, resume PDF, and a placeholder index page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Push to GitHub**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && git push -u origin main
```
Expected: pushes successfully, prints the commit hash and branch.

- [ ] **Step 6: Verify on GitHub**

Run:
```bash
gh repo view christophercorbin/eportfolio-v2 --web
```
Then visually confirm the repo shows the scaffold files. (Or use `gh api repos/christophercorbin/eportfolio-v2/contents -q '.[].name'` to list files via API.)

---

## Task 11: Design and implement the homepage components (delegated to frontend-design skill)

**Files:**
- Create: `~/Eportfolio/eportfolio-v2/src/components/Nav.astro`
- Create: `~/Eportfolio/eportfolio-v2/src/components/Hero.astro`
- Create: `~/Eportfolio/eportfolio-v2/src/components/About.astro`
- Create: `~/Eportfolio/eportfolio-v2/src/components/Experience.astro`
- Create: `~/Eportfolio/eportfolio-v2/src/components/Skills.astro`
- Create: `~/Eportfolio/eportfolio-v2/src/components/Projects.astro`
- Create: `~/Eportfolio/eportfolio-v2/src/components/Certifications.astro`
- Create: `~/Eportfolio/eportfolio-v2/src/components/Contact.astro`
- Create: `~/Eportfolio/eportfolio-v2/src/components/ContactForm.tsx` (React island, STUB only)
- Modify: `~/Eportfolio/eportfolio-v2/src/pages/index.astro` (compose all components)

**Important:** Visual design quality is the explicit goal of this task and is not something to be planned in flat steps — it requires the **`frontend-design` skill**, which manages its own design exploration and iteration process.

- [ ] **Step 1: Invoke the `frontend-design` skill with this brief**

Use the Skill tool to invoke `frontend-design:frontend-design` with the following brief:

> Build the homepage of `christophercorbin.cloud` v2 in `~/Eportfolio/eportfolio-v2/`. The site is a personal portfolio for an AWS Solutions Architect / Security Engineer.
>
> **Stack:** Astro 5 + Tailwind CSS + React 18 (used only for the contact form island). All section content is in `src/data/content.ts` (already populated). The page composes section components.
>
> **Sections required (in order):**
> 1. Sticky `Nav` with anchor links to each section + a CTA to download the resume PDF (`/assets/Christopher_Corbin_Resume.pdf`)
> 2. `Hero` — name, title, subtitle, two CTAs, profile photo (from `/images/profile-photo.jpg`)
> 3. `About` — bio paragraph + stats grid (3 stat tiles)
> 4. `Experience` — vertical timeline of 4 roles
> 5. `Skills` — 8 skill categories
> 6. `Projects` — 3 project cards
> 7. `Certifications` — Credly badges (use the embed.js script `//cdn.credly.com/assets/utilities/embed.js` referenced by `<div data-iframe-width="..." data-share-badge-id="<credlyId>" data-share-badge-host="https://www.credly.com">`) for entries that have a `credlyId`; for entries without, render a styled card.
> 8. `Contact` — contact info + the `ContactForm` React island
>
> **Visual direction (firm constraints):**
> - Distinctive design — explicitly avoid the generic "Bootstrap card-grid + Inter font + slight gradient" AI-generated portfolio aesthetic. Read the current `~/Eportfolio/E-portfolio/index.html` and `~/Eportfolio/E-portfolio/styles.css` for content reference but do NOT replicate the visual design.
> - Restrained color palette with one or two strong accent colors. Strong typography hierarchy. Real whitespace.
> - Dark mode optional but with intent if included (not just inverted colors).
> - Mobile-responsive (this site will be viewed on phones often).
> - Animations subtle — scroll-triggered reveals fine, no heavy parallax.
>
> **Contact form constraint:** The `ContactForm.tsx` React island in this PR is a **stub only**. It should render the form fields (name, email, subject, message) styled appropriately, but on submit it shows "Form submission will be wired up in PR 2" instead of POSTing anywhere. Do NOT call any API. PR 2 will replace the stub with real Amplify backend integration.
>
> **Output:** all 9 component files listed in this task's "Files" section, plus the updated `index.astro` that composes them in order.

- [ ] **Step 2: Verify the build succeeds**

After the design skill produces the components, run:
```bash
cd ~/Eportfolio/eportfolio-v2 && npm run build
```
Expected: build succeeds with no errors. Warnings about React island hydration are acceptable.

- [ ] **Step 3: Manually verify the site in dev mode**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && npm run dev
```
Open `http://localhost:4321/` in a browser. Verify:
- All 8 sections render with correct content from `src/data/content.ts`
- Nav links jump to the right anchors
- Resume download link works
- Profile photo displays
- Credly badges appear (or fail gracefully if Credly's CDN is slow)
- Contact form renders (does not submit — shows the stub message)
- Mobile layout looks correct (browser devtools, narrow viewport)
- No console errors

Stop the dev server (`Ctrl+C`) when done.

- [ ] **Step 4: Commit**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && git add src/ && git status --short
```
Confirm only the 9 component files + `index.astro` are staged.

Then:
```bash
cd ~/Eportfolio/eportfolio-v2 && git commit -m "$(cat <<'EOF'
feat: implement homepage components and compose index page

Adds Nav, Hero, About, Experience, Skills, Projects, Certifications,
and Contact section components, plus a ContactForm React island stub
(real backend wiring lands in PR 2). Designed using the
frontend-design skill with explicit constraints to avoid generic AI
aesthetic. Content sourced from src/data/content.ts; visual design is
new and not a port of the v1 styles.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Design and implement the resume page

**Files:**
- Create: `~/Eportfolio/eportfolio-v2/src/pages/resume.astro`

The resume page in the old site is a standalone HTML page with a printable resume layout. For v2 it should be the same idea — separate route, focused on print-friendliness.

- [ ] **Step 1: Read the old resume.html for reference**

Run:
```bash
cat ~/Eportfolio/E-portfolio/resume.html | head -200
```
Capture the structure (sections, layout, what's printable).

- [ ] **Step 2: Invoke the `frontend-design` skill for the resume page**

Use the Skill tool to invoke `frontend-design:frontend-design` with the following brief:

> Build the `resume.astro` page for `christophercorbin.cloud` v2 in `~/Eportfolio/eportfolio-v2/src/pages/resume.astro`.
>
> **Stack:** Astro 5 + Tailwind CSS. Use `BaseLayout` from `src/layouts/BaseLayout.astro` and consume content from `src/data/content.ts` (specifically the `experience`, `skills`, `certifications` fields).
>
> **Purpose:** standalone resume page meant to look great both on screen and when printed (PDF export via browser's "Print → Save as PDF"). Should also offer a prominent button to download the maintained PDF at `/assets/Christopher_Corbin_Resume.pdf`.
>
> **Reference:** the existing `~/Eportfolio/E-portfolio/resume.html` for content/layout reference, but do NOT replicate the visual design.
>
> **Visual direction:** sober, print-ready. Single-column or two-column layout. Use Tailwind's `print:` modifier to control print styles. Same restrained typography choices as the homepage; consistent with the brand from Task 11.
>
> **Output:** `src/pages/resume.astro` only.

- [ ] **Step 3: Verify the build succeeds**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && npm run build
```
Expected: build succeeds; `dist/resume/index.html` exists.

- [ ] **Step 4: Manually verify in browser**

Run `npm run dev` again, open `http://localhost:4321/resume`, and verify:
- Layout looks correct
- Browser print preview (`Cmd+P`) shows a clean printable layout

- [ ] **Step 5: Commit**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && git add src/pages/resume.astro && git commit -m "$(cat <<'EOF'
feat: implement resume page with print-friendly layout

Standalone /resume route, designed for both screen and print.
Includes prominent download link to the maintained PDF. Designed via
frontend-design skill consistent with the homepage brand.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Add `README.md` and `CLAUDE.md`

**Files:**
- Create: `~/Eportfolio/eportfolio-v2/README.md`
- Create: `~/Eportfolio/eportfolio-v2/CLAUDE.md`

- [ ] **Step 1: Create README.md**

Create `~/Eportfolio/eportfolio-v2/README.md` with:

```markdown
# eportfolio-v2

Personal portfolio site for Christopher Corbin — AWS Solutions Architect & Security Engineer.

**Live:** https://christophercorbin.cloud

## Stack

- **Frontend:** Astro 5 + Tailwind CSS + React 18 (islands only)
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
```

- [ ] **Step 2: Create CLAUDE.md**

Create `~/Eportfolio/eportfolio-v2/CLAUDE.md` with:

```markdown
# CLAUDE.md — Christopher Corbin E-Portfolio v2

## Project

Personal portfolio site at https://christophercorbin.cloud. Single-page (with a separate /resume route), content-focused, no dynamic features beyond a contact form.

## Stack

- **Frontend:** Astro 5 + Tailwind CSS + React 18 (islands only — used for the contact form)
- **Backend:** AWS Amplify Gen 2 backend (TypeScript Lambda + DynamoDB + SES) — *added in PR 2*
- **Hosting:** AWS Amplify Hosting in account `590716168923`
- **DNS:** Cloudflare (gray-cloud, OpenTofu-managed) — *cutover in PR 3*
- **IaC:** OpenTofu (`terraform/` dir, S3 backend in `corbin-tfstate-prod`)
- **CI:** GitHub Actions for lint/build/security/Lighthouse on PRs (Amplify handles deploys)

## Repository structure

```
src/
  pages/       # Astro routes — index.astro, resume.astro
  components/  # Astro section components + ContactForm React island
  data/        # content.ts — all site copy as a structured TS object
  layouts/     # BaseLayout.astro
  styles/      # global.css (Tailwind directives)
public/
  images/
  assets/      # Resume PDF
amplify/       # Amplify Gen 2 backend (added in PR 2)
terraform/     # OpenTofu modules (added in PR 3): cloudflare/, aws-amplify/, aws-monitoring/
docs/
  superpowers/
    specs/     # Design specs
    plans/     # Implementation plans
```

## Conventions

- **Content lives in `src/data/content.ts`.** Components consume from it. Don't hardcode copy in components.
- **Tailwind first.** Use utility classes; only fall back to scoped `<style>` blocks when Tailwind can't express it.
- **No client-side JS unless necessary.** Astro ships zero JS by default. The only React island is `ContactForm.tsx`.
- **TypeScript strict.** No `any`. No `// @ts-expect-error` without an explanation comment.

## Local dev

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # static build to dist/
npm run preview      # preview the built site
```

## Deployment

- `git push origin main` → Amplify auto-builds and deploys to prod environment
- `git push origin dev-feature-x` → Amplify auto-creates a preview env and posts the URL on the PR

## Where the spec/decision history lives

- Design spec: `docs/superpowers/specs/2026-05-02-eportfolio-v2-greenfield-design.md`
- PR 1 plan: `docs/superpowers/plans/2026-05-03-eportfolio-v2-pr1-bootstrap.md`
- (PRs 2-4 plans added as they're written)

## Out of scope (intentional)

- No dynamic project pages, blog, or CMS
- No user accounts or authentication
- No analytics dashboards
- No admin panel
- The contact form is the only dynamic feature

## Old repo

[christophercorbin/AWS-eportfolio](https://github.com/christophercorbin/AWS-eportfolio) is the v1 repo (archived). It used multi-account S3+CloudFront+SAM. Don't reference its patterns — they don't apply here.
```

- [ ] **Step 3: Commit**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && git add README.md CLAUDE.md && git commit -m "$(cat <<'EOF'
docs: add README and CLAUDE.md

README explains the v2 rebuild rationale and links to the archived v1.
CLAUDE.md is the codebase guide for future Claude sessions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Copy spec and plan into the new repo

**Files:**
- Create: `~/Eportfolio/eportfolio-v2/docs/superpowers/specs/2026-05-02-eportfolio-v2-greenfield-design.md`
- Create: `~/Eportfolio/eportfolio-v2/docs/superpowers/plans/2026-05-03-eportfolio-v2-pr1-bootstrap.md`

The spec and PR 1 plan currently live only in the old repo. Copy them into the new repo so the new repo is self-documenting.

- [ ] **Step 1: Copy the spec**

Run:
```bash
cp ~/Eportfolio/E-portfolio/docs/superpowers/specs/2026-05-02-eportfolio-v2-greenfield-design.md \
   ~/Eportfolio/eportfolio-v2/docs/superpowers/specs/2026-05-02-eportfolio-v2-greenfield-design.md
```

- [ ] **Step 2: Copy the plan**

Run:
```bash
cp ~/Eportfolio/E-portfolio/docs/superpowers/plans/2026-05-03-eportfolio-v2-pr1-bootstrap.md \
   ~/Eportfolio/eportfolio-v2/docs/superpowers/plans/2026-05-03-eportfolio-v2-pr1-bootstrap.md
```

- [ ] **Step 3: Verify**

Run:
```bash
ls -la ~/Eportfolio/eportfolio-v2/docs/superpowers/specs/ ~/Eportfolio/eportfolio-v2/docs/superpowers/plans/
```
Expected: both files present.

- [ ] **Step 4: Commit**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && git add docs/ && git commit -m "$(cat <<'EOF'
docs: import design spec and PR 1 plan from v1 repo

Brings the decision history into the new repo so this repository is
self-documenting. The original spec was authored in the v1 repo during
brainstorming; the v1 repo will be archived once decommission completes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Final local validation before pushing for Amplify

- [ ] **Step 1: Run a clean build**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && rm -rf dist node_modules && npm install && npm run build
```
Expected:
- `npm install` succeeds
- `npm run build` succeeds with no errors
- `dist/index.html` and `dist/resume/index.html` both exist
- `dist/_astro/` contains hashed CSS/JS bundles

- [ ] **Step 2: Run typecheck**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && npx astro check
```
Expected: 0 errors. Warnings are OK; errors block.

- [ ] **Step 3: Inspect a built page**

Run:
```bash
grep -c "Christopher Corbin" ~/Eportfolio/eportfolio-v2/dist/index.html
```
Expected: a positive integer (the name appears multiple times in the rendered HTML).

- [ ] **Step 4: Push all commits to GitHub**

Run:
```bash
cd ~/Eportfolio/eportfolio-v2 && git status && git log --oneline -10
```
Confirm: working tree is clean, recent commits are present.

Then:
```bash
cd ~/Eportfolio/eportfolio-v2 && git push origin main
```
Expected: pushes successfully.

---

## Task 16: Set up AWS Amplify Hosting (console-based, manual)

This task is interactive — perform it in the AWS Amplify console because we agreed (spec section 5.5) on console-first then OpenTofu import. The IaC import happens in PR 2.

**Files:** None in this repo. State changes in AWS account `590716168923`.

- [ ] **Step 1: Verify AWS CLI is pointed at the prod account**

Run:
```bash
aws sts get-caller-identity
```
Expected: `"Account": "590716168923"`. If it's a different account, switch profiles before continuing.

- [ ] **Step 2: Open the Amplify console**

Run:
```bash
open "https://us-east-1.console.aws.amazon.com/amplify/home?region=us-east-1#/"
```
This opens the Amplify console in `us-east-1` in your default browser.

- [ ] **Step 3: Create a new Amplify Hosting app**

In the Amplify console:
1. Click **"New app"** → **"Host web app"**
2. Source: **GitHub** (will require OAuth grant if first time — accept)
3. Repository: `christophercorbin/eportfolio-v2`
4. Branch: `main`
5. App settings:
   - App name: `eportfolio-v2`
   - Build settings: accept the auto-detected Astro defaults (build command: `npm run build`, output directory: `dist`)
   - Environment variables: none for this PR
6. Service role: allow Amplify to create a new IAM service role (or use an existing one if you have one set up)
7. Click **"Save and deploy"**

- [ ] **Step 4: Wait for the first build to complete**

The first build will take 2-5 minutes. The console shows: Provision → Build → Deploy → Verify. All four phases must succeed.

If the build fails, read the logs in the console. Common failures:
- Missing dependency → fix in `package.json`, push, Amplify rebuilds automatically
- Build command wrong → adjust in App settings → Build settings
- Output directory wrong → adjust to `dist` if not auto-detected

- [ ] **Step 5: Capture the auto-generated URL**

Once Verify is green, the console shows the live URL in the format:
`https://main.d<10-char-id>.amplifyapp.com`

Note this URL — you'll use it in Task 17 for verification and in PR 3 for the custom domain mapping.

Add it as a GitHub repo description hint:
```bash
gh repo edit christophercorbin/eportfolio-v2 --homepage "https://main.<app-id>.amplifyapp.com"
```
(Replace `<app-id>` with the real ID from the URL.)

---

## Task 17: Verify the deployed site

**Files:** None.

- [ ] **Step 1: HTTP smoke test**

Run (substituting the real Amplify URL):
```bash
AMPLIFY_URL="https://main.<app-id>.amplifyapp.com"
curl -sI "$AMPLIFY_URL" | head -10
```
Expected: `HTTP/2 200`, `content-type: text/html`.

- [ ] **Step 2: Content smoke test**

Run:
```bash
curl -s "$AMPLIFY_URL" | grep -c "Christopher Corbin"
```
Expected: a positive integer.

- [ ] **Step 3: Manual browser verification**

Open the Amplify URL in a browser. Verify:
- Homepage renders correctly with all 8 sections
- Nav anchor links work
- Resume download link returns the PDF (`/assets/Christopher_Corbin_Resume.pdf`)
- Profile image displays
- Credly badges load (or fail gracefully)
- Contact form renders and shows the stub message on submit (does NOT actually submit)
- `/resume` route loads with print-friendly layout
- No JavaScript console errors
- Mobile layout looks correct (devtools, narrow viewport)

- [ ] **Step 4: Verify automatic redeployment works**

Make a trivial change to test the auto-deploy pipeline:
```bash
cd ~/Eportfolio/eportfolio-v2
echo "" >> README.md
git add README.md && git commit -m "chore: trigger Amplify auto-deploy verification"
git push origin main
```

Watch the Amplify console for the new build to start within ~30 seconds. Wait for it to complete (2-5 min). Reload the URL — site should still be up.

If this build fails or doesn't trigger, troubleshoot the GitHub ↔ Amplify connection in the console (App settings → Repository → Reconnect).

---

## Task 18: PR 1 wrap-up

**Files:** None.

- [ ] **Step 1: Confirm all PR 1 exit criteria from the spec**

Read spec section 6 PR 1 exit criteria. Confirm:
- ✅ New repo exists (`christophercorbin/eportfolio-v2`)
- ✅ Site loads at the auto-generated Amplify URL
- ✅ All sections render with correct content
- ✅ No backend wired (contact form stub shows the placeholder message)

- [ ] **Step 2: Update task tracker**

If using TaskWrite/TaskUpdate, mark PR 1 tasks complete. If not, just confirm to yourself.

- [ ] **Step 3: Confirm what's NOT done (so PR 2 picks up cleanly)**

Document for next session / PR 2 scope:
- Custom domain `christophercorbin.cloud` is still on old infra (intentional)
- Contact form is a stub (intentional)
- No CI workflows yet (planned for PR 2)
- No OpenTofu state bucket yet (PR 2 step 22 / PR 3 bootstrap)
- Amplify is console-managed only (no `terraform/aws-amplify/` yet)

- [ ] **Step 4: Tell the user PR 1 is done**

Summarize what shipped, the live Amplify URL (so they can see it), and propose moving to PR 2 plan-writing in a fresh brainstorming/planning conversation when they're ready.

---

## Self-review checklist (run after writing this plan, before handoff)

This section is a record of the plan author's self-check, not a task to execute. Already done before saving.

**1. Spec coverage:**
- ✅ G2 (Astro+Tailwind) — Tasks 2, 3, 4, 7, 8, 9, 11, 12
- ✅ G7 (old repo archive note in v2 README) — Task 13 README content
- ✅ G9 (frontend design quality) — Tasks 11, 12 explicitly invoke `frontend-design` skill
- ✅ Spec Section 5.1 file structure — Tasks 5, 7, 8, 9, 11, 12, 13 collectively produce all v1-PR-1 files
- ✅ Spec Section 5.2 component strategy — Tasks 7, 11
- ✅ Spec Section 5.10 archival note (forward-looking) — explicitly mentioned in Task 13 README, the archive itself is in PR 4

**Spec items NOT in this plan (deferred to later PRs):**
- G1, G5, G6 — PRs 3, 4 (DNS cutover, monitoring, decommission)
- G3 (backend) — PR 2
- G4 (OpenTofu) — PRs 2 (Amplify import) and 3 (DNS, monitoring)
- G8 (CI workflows) — PR 2
- Section 5.3 backend — PR 2
- Section 5.4 Cloudflare DNS — PR 3
- Section 5.5 Amplify IaC import — PR 2
- Section 5.6 monitoring — PR 3
- Section 5.7 GitHub Actions — PR 2
- Section 5.8 Dependabot — PR 2
- Section 5.11 decommission — PR 4

**2. Placeholder scan:**
- Task 7 contains `[copy verbatim ...]` markers — these are intentional placeholders that the implementer fills in by reading the old `index.html`. They are explicitly explained in the task. Acceptable because the alternative is a 200-line task with all the literal copy inlined.
- Task 16 step 5 contains `<app-id>` placeholder — intentional, the implementer captures it from the Amplify console output.
- No other placeholders.

**3. Type consistency:**
- `siteContent` (Task 7) — referenced in Task 8 (`BaseLayout` imports `meta.title`, `meta.description`). Consistent.
- Component names (Nav, Hero, About, etc.) — used consistently in Tasks 11, 13 README, CLAUDE.md.
- `ContactForm.tsx` — Task 11 specifies it's a stub; Task 17 verification expects stub behavior. Consistent.

No fixes needed.
