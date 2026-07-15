# Flow — Deploy to GitHub Pages

This app is a Vite + React project, so unlike a plain HTML file it needs a **build step**
before it can run in a browser. The workflow below builds it automatically every time you
push, so you never have to run a build command yourself.

## One-time setup (5 minutes)

### Step 1 — Create a GitHub repo
1. Go to https://github.com/new
2. Repo name: `flow` (or anything you want)
3. Set to **Public**
4. Click **Create repository**

### Step 2 — Push these files
Open CMD/Terminal inside this project folder:

```bash
git init
git add .
git commit -m "Flow"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/flow.git
git push -u origin main
```
(Replace YOUR_USERNAME with your GitHub username)

### Step 3 — Enable GitHub Pages via Actions
1. Go to your repo on GitHub → **Settings** → **Pages**
2. Under "Build and deployment" → **Source**, select **GitHub Actions** (NOT "Deploy from a branch")
3. That's it — no folder/branch to pick, the included workflow handles it

### Step 4 — Watch it build
1. Go to the **Actions** tab in your repo
2. You'll see a "Deploy to GitHub Pages" run kick off automatically (triggered by the push in Step 2)
3. Wait for it to go green (~1–2 minutes)

Your app is live at:
**https://YOUR_USERNAME.github.io/flow**

---

## Install on Phone (Android)
1. Open Chrome on your phone
2. Go to `https://YOUR_USERNAME.github.io/flow`
3. Tap the **three-dot menu** → **Add to Home Screen**
4. Tap **Add** — Flow appears on your home screen

## Install on PC (Chrome/Edge)
1. Open Chrome or Edge
2. Go to `https://YOUR_USERNAME.github.io/flow`
3. Look for the **install icon** in the address bar
4. Click it → **Install**

---

## Updating the app
Whenever you change anything in `src/`:
```bash
git add .
git commit -m "update"
git push
```
GitHub Actions rebuilds and redeploys automatically — check the **Actions** tab for progress.
The live site updates within ~1–2 minutes of a green build.

---

## Troubleshooting a blank page
- **Blank page, no errors mentioned above:** open your browser's DevTools console (F12) on the
  live URL and check for a red error. The most common cause is Pages still set to "Deploy from
  a branch" instead of "GitHub Actions" (Step 3) — that serves the raw, unbuilt source instead
  of the compiled app.
- **404s for `/assets/...` files:** make sure you haven't reverted the `base: './'` setting in
  `vite.config.ts` — it's what lets the built app find its own files when hosted in a
  subfolder like `username.github.io/flow/`.
- **Still stuck:** check the Actions tab — if the build step failed (red ✕), click into it to
  read the error; nothing will deploy until the build succeeds.
