# Deployment

## GitHub Pages (existing)

`npm run build` writes `dist/` using the existing `/portfolio-2026/` base.
The existing GitHub Actions deployment is unchanged.

## Cloudflare Pages (temporary test site)

Use a separate Pages project and its generated `pages.dev` address. Do not attach
the custom domain or disable GitHub Pages during testing.

Git integration settings:

- Repository: `Sauhard192/portfolio-2026`
- Production branch: `main`
- Build command: `npm run build:cloudflare`
- Build output directory: `dist-cloudflare`
- Root directory: repository root
- Node version: 22.16.0 or later compatible Node 22 release (set `NODE_VERSION`)

The Cloudflare build uses `/` for both assets and React Router. It does not change
the GitHub Pages build output. No additional dependencies are required.

Keep the output free of a top-level `404.html`: Cloudflare Pages then uses its
built-in SPA fallback to serve React for nested routes. React remains responsible
for the application's not-found page.

Before sharing the test deployment, open and refresh Home, Art, Photography,
Contact, a case study, and an individual art/photo detail URL. Also check images,
the CV download, browser Back/Forward, and the spiral gallery.

Git integration deploys committed code from GitHub, not uncommitted local changes.
