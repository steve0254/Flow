# Flow PWA — Deploy to GitHub Pages

## One-time setup (5 minutes)

### Step 1 — Create a GitHub repo
1. Go to https://github.com/new
2. Repo name: `flow` (or anything you want)
3. Set to **Public**
4. Click **Create repository**

### Step 2 — Push these files

Open CMD/Terminal inside this `flow-pwa` folder:

```bash
git init
git add .
git commit -m "Flow PWA"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/flow.git
git push -u origin main
```
(Replace YOUR_USERNAME with your GitHub username)

### Step 3 — Enable GitHub Pages
1. Go to your repo on GitHub
2. Click **Settings** → scroll down to **Pages**
3. Under "Source" select **Deploy from a branch**
4. Branch: **main** / folder: **/ (root)**
5. Click **Save**

Wait ~60 seconds. Your app is live at:
**https://YOUR_USERNAME.github.io/flow**

---

## Install on Phone (Android)
1. Open Chrome on your phone
2. Go to `https://YOUR_USERNAME.github.io/flow`
3. Tap the **three-dot menu** → **Add to Home Screen**
4. Tap **Add** — Flow appears on your home screen
5. Long-press the icon → you can also pin it to your notification shade

## Install on PC (Chrome/Edge)
1. Open Chrome or Edge
2. Go to `https://YOUR_USERNAME.github.io/flow`
3. Look for the **install icon** in the address bar (looks like a monitor with a down arrow)
4. Click it → **Install**
5. Flow opens in its own window, appears in taskbar and Start Menu

---

## Updating the app
Whenever you change `index.html`:
```bash
git add .
git commit -m "update"
git push
```
GitHub Pages updates in ~30 seconds. The app auto-refreshes on next launch.

---

## Your sync key
First time you open Flow:
- Tap **⇅ Sync** at the bottom
- Tap **Create New Key** on your first device
- Copy the key, paste it on your second device → **Connect Key**
- Done — both devices stay in sync automatically
