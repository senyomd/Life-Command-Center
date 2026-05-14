# Deployment Guide

## Local Development

```bash
cd life-dashboard-react
npm install
npm run dev
```

Opens at http://localhost:3000

## Build for Production

```bash
cd life-dashboard-react
npm run build
```

Output: `life-dashboard-react/dist/` — ready to deploy as a static site.

Build stats:
- `dist/assets/index.js` — ~290KB (~88KB gzipped)
- `dist/assets/index.css` — ~8KB (~2KB gzipped)

---

## Deployment Options

### Option 1: Vercel (Recommended)

1. Push repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import `Life-Command-Center` repo
4. Set **Root Directory** to `life-dashboard-react`
5. Framework preset: **Vite**
6. Click Deploy

Auto-deploys on every push to `main`.

### Option 2: Netlify

1. Push repo to GitHub
2. Go to [netlify.com](https://netlify.com) → Add new site → Import from Git
3. Configure:
   - **Base directory:** `life-dashboard-react`
   - **Build command:** `npm run build`
   - **Publish directory:** `life-dashboard-react/dist`
4. Deploy

### Option 3: GitHub Pages

1. Update `vite.config.js`:

```javascript
export default defineConfig({
  base: '/Life-Command-Center/',
  plugins: [react()],
  server: { port: 3000, open: true },
})
```

2. Build:

```bash
cd life-dashboard-react
npm run build
```

3. Push `dist/` to `gh-pages` branch:

```bash
git subtree push --prefix life-dashboard-react/dist origin gh-pages
```

4. Enable GitHub Pages in repo Settings → Pages → Branch: `gh-pages`

**Note:** Revert the `base` change after deploying if you want local dev to still work, or keep it and use `http://localhost:3000/Life-Command-Center/`.

### Option 4: Self-Hosted (Static Server)

```bash
cd life-dashboard-react
npm run build
npx serve dist
```

Or copy `dist/` to any static hosting (nginx, Apache, S3, etc.).

**nginx example:**

```nginx
server {
  listen 80;
  root /var/www/life-command-center/dist;
  index index.html;

  # Required for React Router (BrowserRouter)
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

## React Router Note

The app uses `BrowserRouter` (not `HashRouter`). All deployments must be configured to serve `index.html` for any route — otherwise direct navigation to `/finance` or `/tasks` will 404.

- Vercel/Netlify: handled automatically
- GitHub Pages: add a `404.html` that redirects to `index.html`
- nginx/Apache: see config examples above

---

## Environment Variables

Currently the app uses only `localStorage` — no backend, no API keys needed.

If adding a backend in the future, create `life-dashboard-react/.env.local`:

```
VITE_API_URL=https://api.example.com
VITE_API_KEY=your-key-here
```

Access in code: `import.meta.env.VITE_API_URL`

`.env.local` is gitignored by default.

---

## Data / Database

**Current:** `localStorage` — all data lives in the browser.

Implications:
- Data is per-device, per-browser
- Clearing browser data wipes everything
- No sync across devices

**Future migration options:**
| Option | Effort | Cost |
|--------|--------|------|
| Firebase Realtime DB | Low | Free tier |
| Supabase (PostgreSQL) | Medium | Free tier |
| MongoDB Atlas | Medium | Free tier |
| Custom API | High | Depends |

The engine architecture makes migration straightforward: swap the `localStorage.setItem`/`getItem` calls inside each engine with API calls. React hooks and components stay unchanged.

---

## Monitoring

- Open browser DevTools → Console for runtime errors
- Check Application → Local Storage for data state
- Test on mobile (iOS Safari, Android Chrome) for layout issues
- Verify `npm run build` passes before deploying

---

## Rollback

```bash
# Find the last good commit
git log --oneline

# Revert to it
git revert <bad-commit-hash>
npm run build
# Deploy again
```

Or on Vercel/Netlify: use the dashboard to instantly roll back to a previous deployment.
